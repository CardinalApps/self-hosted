import { getEnabledLogLevels } from './logging'

const LOG_LEVEL_VARS = [
  'HTTP_LOG_LEVEL',
  'EVENTS_LOG_LEVEL',
  'INDEXING_LOG_LEVEL',
  'JOBS_LOG_LEVEL',
  'TRANSCODER_LOG_LEVEL',
  'DATABASE_LOG_LEVEL',
]

/* eslint-disable turbo/no-undeclared-env-vars -- the levels are read straight from the real env vars */
describe('getEnabledLogLevels', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    LOG_LEVEL_VARS.forEach((name) => delete process.env[name])
    process.env.NODE_ENV = 'production'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('leaves debug chatter off on a production server', () => {
    const levels = getEnabledLogLevels()

    expect(levels).toContain('log')
    expect(levels).toContain('warn')
    expect(levels).toContain('error')
    expect(levels).not.toContain('debug')
    expect(levels).not.toContain('verbose')
  })

  it('prints everything while developing', () => {
    process.env.NODE_ENV = 'development'

    expect(getEnabledLogLevels()).toContain('debug')
  })

  // The per-module log levels emit through Nest's debug level, so asking for one has to re-enable it
  it.each(LOG_LEVEL_VARS)('prints debug once %s asks for it', (variable) => {
    process.env[variable] = '20'

    expect(getEnabledLogLevels()).toContain('debug')
  })

  it('leaves debug off for a module level that only asks for info', () => {
    process.env.INDEXING_LOG_LEVEL = '10'

    expect(getEnabledLogLevels()).not.toContain('debug')
  })
})
