import {
  test,
  expect,
  describe,
} from '@jest/globals'

import {
  ServerOfflineError,
  ServerNotFoundError,
  MatchmakerUnavailableError,
  QuotaExceededError,
  RelayLimitError,
  InvalidProbeSignatureError,
  RelayAbortedError,
} from '../src'

// Every Remote Access error class must behave like a regular Error so consumers
// can use `instanceof`, surface .name in logs, and serialize through JSON.
const cases = [
  { ctor: ServerOfflineError, name: 'ServerOfflineError' },
  { ctor: ServerNotFoundError, name: 'ServerNotFoundError' },
  { ctor: MatchmakerUnavailableError, name: 'MatchmakerUnavailableError' },
  { ctor: QuotaExceededError, name: 'QuotaExceededError' },
  { ctor: RelayLimitError, name: 'RelayLimitError' },
  { ctor: InvalidProbeSignatureError, name: 'InvalidProbeSignatureError' },
  { ctor: RelayAbortedError, name: 'RelayAbortedError' },
] as const

describe.each(cases)('$name', ({ ctor, name }) => {
  test('is an instance of Error', () => {
    const err = new ctor('boom')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ctor)
  })

  test('exposes its class name on .name', () => {
    const err = new ctor('boom')
    expect(err.name).toBe(name)
  })

  test('serializes .message cleanly through JSON.stringify', () => {
    const err = new ctor('something went wrong')
    expect(JSON.parse(JSON.stringify(err.message))).toBe('something went wrong')
  })

  test('supports an optional cause', () => {
    const cause = new Error('root')
    const err = new ctor('wrapper', { cause })
    expect(err.message).toBe('wrapper')
    // `cause` is part of the standard Error interface since ES2022.
    expect((err as Error & { cause?: unknown }).cause).toBe(cause)
  })
})
