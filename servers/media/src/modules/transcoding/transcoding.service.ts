import { spawn } from 'child_process'
import { PassThrough } from 'stream'
import { Injectable, Logger } from '@nestjs/common'

import { log, LogModule, LogLevel } from '../../utils/logging'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static')

@Injectable()
export class TranscodingService {
  /**
   * Spawns an FFmpeg process that transcodes an audio file to MP3 and pipes
   * the output into a PassThrough stream suitable for use with StreamableFile.
   *
   * `startSeconds` lets the caller seek into the source — used to serve Range
   * requests where the requested byte offset maps to a non-zero time offset.
   */
  transcodeAudioToMp3(inputPath: string, bitrate = 320, startSeconds = 0): PassThrough {
    const output = new PassThrough()

    // `-ss` placed AFTER `-i` performs an output-side (sample-accurate) seek
    // rather than the faster input-side keyframe seek. Slightly higher seek
    // latency in exchange for no audible clicks at the seek point.
    const args: string[] = ['-i', inputPath]
    if (startSeconds > 0) {
      args.push('-ss', startSeconds.toString())
    }
    args.push(
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', `${bitrate}k`,
      '-f', 'mp3',
      'pipe:1',
    )

    const ffmpeg = spawn(ffmpegPath, args)

    ffmpeg.stdout.pipe(output)

    ffmpeg.stderr.on('data', (data: Buffer) => {
      log(LogModule.TRANSCODING, LogLevel.DEBUG, data.toString().trim())
    })

    ffmpeg.on('error', (error) => {
      Logger.error(error.message, 'Transcoding')
      output.destroy(error)
    })

    // Kill the FFmpeg process if the consumer closes the stream early
    // (e.g. client disconnects, browser hits Content-Length).
    output.on('close', () => {
      if (ffmpeg.exitCode === null && !ffmpeg.killed) {
        ffmpeg.kill('SIGKILL')
      }
    })

    return output
  }
}
