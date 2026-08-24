import {
  test,
  expect,
  describe,
} from '@jest/globals'

import * as RemoteAccess from '../src'

// Surface check: barrel must export everything callers depend on.
describe('@cardinalapps/remote-access barrel exports', () => {
  test('exposes every required named export and none is undefined', () => {
    const expected = [
      // Constants
      'HEADERS',
      'MESSAGE_TYPES',
      'DEFAULT_MEDIA_SERVER_PORT',
      'WSS_PATH',
      'WSS_CLOSE_SUPERSEDED',
      'WSS_CLOSE_FORBIDDEN',
      'WSS_CLOSE_PING_TIMEOUT',
      'WSS_CLOSE_NOT_APPROVED',
      'WSS_CLOSE_BANNED',
      'PROBE_TIMESTAMP_SKEW_SECONDS',
      'PROTOCOL_VERSION',

      // Errors
      'ServerOfflineError',
      'ServerNotFoundError',
      'MatchmakerUnavailableError',
      'QuotaExceededError',
      'RelayLimitError',
      'InvalidProbeSignatureError',
      'RelayAbortedError',
    ]

    for (const name of expected) {
      expect((RemoteAccess as Record<string, unknown>)[name]).toBeDefined()
    }
  })
})
