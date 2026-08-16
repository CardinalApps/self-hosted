import { Logger, LogLevel as NestLogLevel } from '@nestjs/common'
import { ENV_VAR, envVar, getCurrentMode, Mode } from './env'

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

// Every env var that can turn a module's output up to the debug tier
const MODULE_LOG_LEVEL_VARS: ENV_VAR[] = [
  'HTTP_LOG_LEVEL',
  'EVENTS_LOG_LEVEL',
  'INDEXING_LOG_LEVEL',
  'JOBS_LOG_LEVEL',
  'TRANSCODER_LOG_LEVEL',
  'DATABASE_LOG_LEVEL',
]

const QUIET_LEVELS: NestLogLevel[] = ['log', 'warn', 'error', 'fatal']
const ALL_LEVELS: NestLogLevel[] = [...QUIET_LEVELS, 'debug', 'verbose']

/**
 * The severities this server prints. Nest enables every one of them out of the
 * box, which leaves a self-hosted server narrating its own housekeeping to a
 * log nobody reads. Debug output is worth having, but only when it was asked
 * for: by developing against the server, or by turning a module's level up.
 */
export const getEnabledLogLevels = (): NestLogLevel[] => {
  if (getCurrentMode() === Mode.DEVELOPMENT) {
    return ALL_LEVELS
  }

  const moduleDebugRequested = MODULE_LOG_LEVEL_VARS
    .some((variable) => Number(envVar(variable, LogLevel.SILENT)) >= LogLevel.DEBUG)

  return moduleDebugRequested ? ALL_LEVELS : QUIET_LEVELS
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
