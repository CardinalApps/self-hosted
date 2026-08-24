import { describe, it, expect } from 'vitest'

import { recordedKeysToBinding } from './record'

describe('recordedKeysToBinding', () => {
  /*
   * The recorder reports the physical modifier that was held. Storing that would pin the binding
   * to the machine it was set on, so the platform's primary modifier is stored as `mod` and
   * resolves back to Command or Control wherever the account is next used.
   */
  it('stores the platform primary modifier as mod', () => {
    expect(recordedKeysToBinding(['meta', 'comma'], true)).toBe('mod+comma')
    expect(recordedKeysToBinding(['ctrl', 'comma'], false)).toBe('mod+comma')
  })

  it('keeps the other modifier literal on Apple keyboards', () => {
    expect(recordedKeysToBinding(['ctrl', 'p'], true)).toBe('ctrl+p')
    expect(recordedKeysToBinding(['meta', 'p'], false)).toBe('meta+p')
  })

  it('writes the modifiers in a consistent order', () => {
    expect(recordedKeysToBinding(['p', 'shift', 'meta'], true)).toBe('mod+shift+p')
  })

  it('has no binding until a key of its own is pressed', () => {
    expect(recordedKeysToBinding(['meta', 'shift'], true)).toBe('')
    expect(recordedKeysToBinding([], true)).toBe('')
  })
})
