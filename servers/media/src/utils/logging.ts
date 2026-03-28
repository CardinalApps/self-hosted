import { Logger } from '@nestjs/common'
import { envVar } from './env'

// Severity levels
export enum LogLevel {
  SILENT = 0,
  INFO = 10,
  DEBUG = 20,
}

export enum LogModule {
  HTTP = 'HTTP',
  EVENTS = 'Events',
  INDEXING = 'Indexing',
  JOBS = 'Jobs',
  TRANSCODING = 'Transcoding',
}

/**
 * Optional logging utility designed to work with the severity levels that the
 * user can set in env vars.
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

  // Prints the message to the console using the correct Logging function fo the
  // severity level of the incoming log
  const print = (message, module) => level === LogLevel.DEBUG
    ? Logger.debug(message, module)
    : Logger.log(message, module)

  // Filters logs depending on the severity levels set in the env vars
  if (levelSetByEnvironment !== LogLevel.SILENT) {
    // Lowest rung on the severity ladder
    if (levelSetByEnvironment >= LogLevel.INFO && levelSetByEnvironment < LogLevel.DEBUG) {
      print(message, module)
    }
    // Second rung
    else if (levelSetByEnvironment >= LogLevel.DEBUG) {
      print(message, module)
    }
  }
}
