import { Logger } from '@nestjs/common'
import { envVar } from './env'

export enum LogLevel {
  SILENT = 0,
  DEBUG = 10,
  INFO = 20,
}

export enum LogModule {
  HTTP = 'HTTP',
  EVENTS = 'Events',
  INDEXING = 'Indexing',
  JOBS = 'Jobs',
  TRANSCODING = 'Transcoding',
}

/**
 * Optional logging utility designed to work with the log levels that the user
 * can set in env vars.
 */
export const log = (module: LogModule, level: LogLevel, message: string) => {
  let levelSetByEnvironment

  switch (module) {
    case LogModule.HTTP:
      levelSetByEnvironment = envVar('HTTP_LOG_LEVEL', LogLevel.SILENT)
      break
    case LogModule.EVENTS:
      levelSetByEnvironment = envVar('EVENTS_LOG_LEVEL', LogLevel.SILENT)
      break
    case LogModule.INDEXING:
      levelSetByEnvironment = envVar('INDEXING_LOG_LEVEL', LogLevel.INFO)
      break
    case LogModule.JOBS:
      levelSetByEnvironment = envVar('JOBS_LOG_LEVEL', LogLevel.INFO)
      break
    case LogModule.TRANSCODING:
      levelSetByEnvironment = envVar('TRANSCODER_LOG_LEVEL', LogLevel.SILENT)
      break
  }

  if (levelSetByEnvironment !== LogLevel.SILENT && level >= levelSetByEnvironment) {
    if (level === LogLevel.DEBUG) {
      Logger.debug(message, module)
    } else if (level === LogLevel.INFO) {
      Logger.log(message, module)
    }
  }
}
