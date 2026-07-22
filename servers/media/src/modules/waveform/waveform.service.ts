import { spawn } from 'child_process'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { MusicTrack } from '../music-track/music-track.entity'
import { MusicTrackWaveform } from '../music-track/music-track-waveform.entity'

import { EventService } from '../event/event.service'
import { WaveformEvents } from './events'

import {
  AnalyzedWaveform,
  WaveformAnalyzer,
  WAVEFORM_SAMPLE_RATE,
  WAVEFORM_VERSION,
  parseEbur128Summary,
  quantizeWaveform,
} from './analysis'

import { envVar } from '../../utils/env'

// Same resolution chain as the TranscodingService: the FFMPEG_PATH env var
// wins, otherwise the bundled ffmpeg-static binary.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = (envVar('FFMPEG_PATH', null) as string) || require('ffmpeg-static')

// Cap on simultaneous on-demand generations, so a burst of cold plays can't
// fork an unbounded number of ffmpeg processes. Excess requests wait FIFO.
const ON_DEMAND_CONCURRENCY = 2

// The ebur128 filter logs one line per 100ms of audio; only the summary at the
// very end matters, so stderr is kept as a bounded rolling tail.
const STDERR_TAIL_BYTES = 65536

type LoudnessSummary = {
  integratedLufs: number | null,
  truePeakDb: number | null,
}

@Injectable()
export class WaveformService {
  constructor(
    @InjectRepository(MusicTrack)
    private musicTrackRepository: Repository<MusicTrack>,
    @InjectRepository(MusicTrackWaveform)
    private waveformRepository: Repository<MusicTrackWaveform>,
    private readonly eventService: EventService,
  ) {}

  private inFlight = new Map<number, Promise<MusicTrackWaveform>>()
  private queuedOnDemand = new Map<number, Promise<MusicTrackWaveform>>()
  private onDemandActive = 0
  private onDemandWaiting: Array<() => void> = []

  /**
   * Returns the stored waveform for a track, or null.
   */
  async getForTrack(trackId: number): Promise<MusicTrackWaveform | null> {
    return await this.waveformRepository.findOne({
      where: {
        track: {
          id: trackId,
        },
      },
    })
  }

  /**
   * Generates and stores the waveform for a track. Concurrent calls for the
   * same track share a single generation.
   */
  generateForTrack(trackId: number): Promise<MusicTrackWaveform> {
    const existing = this.inFlight.get(trackId)
    if (existing) {
      return existing
    }

    const generation = this.generate(trackId).finally(() => {
      this.inFlight.delete(trackId)
    })

    this.inFlight.set(trackId, generation)

    return generation
  }

  /**
   * Generates a waveform outside of the job system, for tracks that are being
   * played right now. Requests are deduplicated against both running and
   * queued generations, and run at limited concurrency.
   */
  generateOnDemand(trackId: number): Promise<MusicTrackWaveform> {
    const existing = this.inFlight.get(trackId) ?? this.queuedOnDemand.get(trackId)
    if (existing) {
      return existing
    }

    const generation = this.acquireOnDemandSlot()
      .then(() => this.generateForTrack(trackId))
      .finally(() => {
        this.queuedOnDemand.delete(trackId)
        this.releaseOnDemandSlot()
      })

    this.queuedOnDemand.set(trackId, generation)

    return generation
  }

  /**
   * Waits for a free on-demand generation slot.
   */
  private acquireOnDemandSlot(): Promise<void> {
    if (this.onDemandActive < ON_DEMAND_CONCURRENCY) {
      this.onDemandActive++
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      this.onDemandWaiting.push(resolve)
    })
  }

  /**
   * Hands the slot to the next waiter, or frees it.
   */
  private releaseOnDemandSlot(): void {
    const next = this.onDemandWaiting.shift()
    if (next) {
      next()
    } else {
      this.onDemandActive--
    }
  }

  /**
   * The full generation pipeline for one track: decode, analyze, quantize,
   * upsert, announce over SSE.
   */
  private async generate(trackId: number): Promise<MusicTrackWaveform> {
    const track = await this.musicTrackRepository.findOne({
      where: {
        id: trackId,
      },
      relations: {
        file: true,
      },
    })

    if (!track?.file?.absolutePath) {
      throw new Error(`Track ${trackId} has no file to analyze`)
    }

    const { analyzed, loudness } = await this.analyzeFile(track.file.absolutePath, track.duration)

    if (!analyzed.binCount) {
      throw new Error(`Decoding ${track.file.absolutePath} produced no audio`)
    }

    const quantized = quantizeWaveform(analyzed)
    const existing = await this.getForTrack(trackId)

    const saved = await this.waveformRepository.save({
      ...(existing ? { id: existing.id } : {}),
      track: { id: trackId },
      version: WAVEFORM_VERSION,
      binCount: analyzed.binCount,
      data: quantized,
      integratedLufs: loudness.integratedLufs,
      truePeakDb: loudness.truePeakDb,
      silenceLeadIn: analyzed.silenceLeadIn,
      silenceLeadOut: analyzed.silenceLeadOut,
    } as Partial<MusicTrackWaveform>)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { track: _track, ...waveform } = saved

    this.eventService.emitPublic(WaveformEvents.READY, {
      musicTrackId: track.musicTrackId,
      waveform,
    })

    return saved
  }

  /**
   * Decodes a file with ffmpeg and analyzes it in one pass: the audio is split
   * into a mono PCM stream for binning and an ebur128 branch for loudness.
   */
  private analyzeFile(absolutePath: string, durationSeconds: number | null | undefined): Promise<{
    analyzed: AnalyzedWaveform,
    loudness: LoudnessSummary,
  }> {
    return new Promise((resolve, reject) => {
      const analyzer = new WaveformAnalyzer(durationSeconds)
      let stderrTail = ''
      let settled = false

      const args: string[] = ['-hide_banner', '-i', absolutePath]
      args.push(
        '-filter_complex',
        '[0:a]asplit=2[wave][loudness];'
          + `[wave]aresample=${WAVEFORM_SAMPLE_RATE},aformat=sample_fmts=s16:channel_layouts=mono[waveout];`
          + '[loudness]ebur128=peak=true[loudnessout]',
      )
      args.push('-map', '[waveout]', '-f', 's16le', 'pipe:1')
      args.push('-map', '[loudnessout]', '-f', 'null', '-')

      const ffmpeg = spawn(ffmpegPath, args)

      ffmpeg.stdout.on('data', (chunk: Buffer) => {
        analyzer.push(chunk)
      })

      ffmpeg.stderr.on('data', (chunk: Buffer) => {
        stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_TAIL_BYTES)
      })

      ffmpeg.on('error', (error) => {
        if (!settled) {
          settled = true
          reject(error)
        }
      })

      ffmpeg.on('close', (code) => {
        if (settled) {
          return
        }
        settled = true

        if (code !== 0) {
          Logger.error(`ffmpeg exited with code ${code} for ${absolutePath}`, 'Waveform')
          return reject(new Error(`ffmpeg exited with code ${code}: ${stderrTail.slice(-500)}`))
        }

        resolve({
          analyzed: analyzer.finish(),
          loudness: parseEbur128Summary(stderrTail),
        })
      })
    })
  }
}
