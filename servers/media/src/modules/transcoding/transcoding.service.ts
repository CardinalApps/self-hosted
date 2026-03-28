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
   */
  transcodeAudioToMp3(inputPath: string, bitrate = 320): PassThrough {
    const output = new PassThrough()

    const ffmpeg = spawn(ffmpegPath, [
      '-i',
      inputPath,
      '-vn',
      '-c:a',
      'libmp3lame',
      '-b:a',
      `${bitrate}k`,
      '-f',
      'mp3',
      'pipe:1',
    ])

    ffmpeg.stdout.pipe(output)

    ffmpeg.stderr.on('data', (data: Buffer) => {
      log(LogModule.TRANSCODING, LogLevel.DEBUG, data.toString().trim())
    })

    ffmpeg.on('error', (error) => {
      Logger.error(error.message, 'Transcoding')
      output.destroy(error)
    })

    return output
  }
}
