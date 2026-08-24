import { PopularityService } from './popularity.service'

import { popularityAPI } from '../../utils/cloud'

jest.mock('../../utils/cloud', () => ({
  popularityAPI: jest.fn(),
}))

const RECORDING_ID = '3fc2f0bb-0f4a-4a5e-9a02-2f79e2b13e6b'
const JWT = 'header.payload.signature'

const paidUser = { subscription: 'pro' }

function historyEntry(createdAt: Date, metaValue?: string) {
  return {
    createdAt,
    track: {
      metadata: metaValue === undefined
        ? []
        : [{ metaKey: 'musicbrainz_recordingid', metaValue }],
    },
  }
}

// Lets the fire-and-forget send settle before asserting
async function flush() {
  await new Promise((resolve) => setImmediate(resolve))
  await new Promise((resolve) => setImmediate(resolve))
}

function createService(entries: unknown[] = [], settingEnabled = true) {
  const repository = { find: jest.fn().mockResolvedValue(entries) }
  const statsRepository = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((stats) => stats),
    save: jest.fn(),
  }
  const settingsService = { get: jest.fn().mockResolvedValue(settingEnabled) }
  const service = new PopularityService(repository as never, statsRepository as never, settingsService as never)
  return { service, repository, statsRepository, settingsService }
}

// Opens a collection window in the past so the next request is allowed to send
function elapseInterval(service: PopularityService) {
  (service as never as { windowStart: Date }).windowStart = new Date(Date.now() - 16 * 60_000)
}

// Rewinds the null-window throttle so the next request re-checks the setting
function elapseNullThrottle(service: PopularityService) {
  (service as never as { lastNullWindowCheck: number }).lastNullWindowCheck = Date.now() - 16 * 60_000
}

function getWindowStart(service: PopularityService): Date | null {
  return (service as never as { windowStart: Date | null }).windowStart
}

describe('PopularityService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('opens the window on the first eligible request without sending', async () => {
    const { service, repository } = createService([historyEntry(new Date(), RECORDING_ID)])

    expect(getWindowStart(service)).toBeNull()

    service.maybeSend(JWT, paidUser)
    await flush()

    expect(getWindowStart(service)).toBeInstanceOf(Date)
    expect(repository.find).not.toHaveBeenCalled()
    expect(popularityAPI).not.toHaveBeenCalled()
  })

  it('does not send before the interval has elapsed', async () => {
    const { service, repository } = createService()
    elapseNullThrottle(service)

    service.maybeSend(JWT, paidUser)
    await flush()
    service.maybeSend(JWT, paidUser)
    await flush()

    expect(repository.find).not.toHaveBeenCalled()
    expect(popularityAPI).not.toHaveBeenCalled()
  })

  it('does not send for accounts without the popularity_data_pool entitlement', async () => {
    const { service, repository } = createService()
    elapseInterval(service)

    service.maybeSend(JWT, {})
    service.maybeSend(JWT, { subscription: 'not-a-tier' })
    await flush()

    expect(repository.find).not.toHaveBeenCalled()
    expect(popularityAPI).not.toHaveBeenCalled()
  })

  it('sends normalized plays with the donated JWT and drops entries without a valid recording ID', async () => {
    const playedAt = new Date(Date.now() - 60_000)
    const { service } = createService([
      historyEntry(playedAt, RECORDING_ID),
      historyEntry(playedAt),
      historyEntry(playedAt, 'not-a-uuid'),
    ])
    elapseInterval(service)

    service.maybeSend(JWT, paidUser)
    await flush()

    expect(popularityAPI).toHaveBeenCalledTimes(1)
    expect(popularityAPI).toHaveBeenCalledWith('/api/collect', 'POST', {
      JWT,
      body: {
        plays: [{ recordingId: RECORDING_ID, playedAt: playedAt.toISOString() }],
      },
    })
  })

  it('sends nothing when no plays in the window have a recording ID', async () => {
    const { service } = createService([historyEntry(new Date())])
    elapseInterval(service)

    service.maybeSend(JWT, paidUser)
    await flush()

    expect(popularityAPI).not.toHaveBeenCalled()
  })

  it('advances the window after a send so the next request does not resend', async () => {
    const { service, repository } = createService([historyEntry(new Date(), RECORDING_ID)])
    elapseInterval(service)

    service.maybeSend(JWT, paidUser)
    await flush()
    service.maybeSend(JWT, paidUser)
    await flush()

    expect(repository.find).toHaveBeenCalledTimes(1)
  })

  it('adds sent plays to the lifetime counter, but not failed batches', async () => {
    const { service, statsRepository } = createService([historyEntry(new Date(), RECORDING_ID)])
    elapseInterval(service)

    service.maybeSend(JWT, paidUser)
    await flush()

    expect(statsRepository.save).toHaveBeenCalledWith({ playsContributed: 1 })

    ;(popularityAPI as jest.Mock).mockRejectedValueOnce(new Error('cloud unreachable'))
    elapseInterval(service)
    service.maybeSend(JWT, paidUser)
    await flush()

    expect(statsRepository.save).toHaveBeenCalledTimes(1)
  })

  it('does not send while the service is disabled server-wide', async () => {
    const { service } = createService([historyEntry(new Date(), RECORDING_ID)], false)
    elapseInterval(service)

    service.maybeSend(JWT, paidUser)
    await flush()

    expect(popularityAPI).not.toHaveBeenCalled()
  })

  it('resets the window while disabled, so re-enabling starts collection fresh', async () => {
    const { service, settingsService } = createService([historyEntry(new Date(), RECORDING_ID)], false)
    elapseInterval(service)

    service.maybeSend(JWT, paidUser)
    await flush()

    expect(getWindowStart(service)).toBeNull()

    settingsService.get.mockResolvedValue(true)
    elapseNullThrottle(service)
    service.maybeSend(JWT, paidUser)
    await flush()

    expect(getWindowStart(service)).toBeInstanceOf(Date)
    expect(popularityAPI).not.toHaveBeenCalled()
  })

  it('drops the batch on failure without throwing and without retrying', async () => {
    (popularityAPI as jest.Mock).mockRejectedValueOnce(new Error('cloud unreachable'))

    const { service, repository } = createService([historyEntry(new Date(), RECORDING_ID)])
    elapseInterval(service)

    expect(() => service.maybeSend(JWT, paidUser)).not.toThrow()
    await flush()

    service.maybeSend(JWT, paidUser)
    await flush()

    expect(repository.find).toHaveBeenCalledTimes(1)
    expect(popularityAPI).toHaveBeenCalledTimes(1)
  })
})
