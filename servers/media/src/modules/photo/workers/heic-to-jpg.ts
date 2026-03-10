import * as worker_threads from 'worker_threads'
import * as fs from 'fs'
import * as heicConvert from 'heic-convert'
import { Logger } from '@nestjs/common'

import { envVar } from '../../../utils/env'
import { log, LogModule, LogLevel } from '../../../utils/logging'

const { absoluteFilePath } = worker_threads.workerData
const timeoutInSeconds = envVar('HEIF_CONVERSION_TIMEOUT', 30) as number

enum Errors {
  TIMEOUT = 'HEIF to JPG conversion timeout',
  CONVERSION = 'Error when converting image',
}

async function convert() {
  log(LogModule.JOBS, LogLevel.DEBUG, `Converting HEIF image to JPG with a ${timeoutInSeconds} second timeout for file: ${absoluteFilePath}`)

  const timeout = setTimeout(() => {
    throw new Error(Errors.TIMEOUT)
  }, timeoutInSeconds * 1000)

  let jpg = null

  try {
    const heifBuffer = fs.readFileSync(absoluteFilePath)
    jpg = await heicConvert({
      buffer: heifBuffer,
      format: 'JPEG',
      quality: 1,
    })
  } catch (error) {
    Logger.error(`HEIF to JPEG conversion failed. ${error.toString()}`)
    clearTimeout(timeout)
    throw new Error(Errors.CONVERSION)
  }

  // Success
  clearTimeout(timeout)
  worker_threads.parentPort.postMessage(jpg)
}

convert()
