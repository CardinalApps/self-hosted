import { describe, it, expect } from 'vitest'

import { indicatorState } from './RemoteAccessStatusIndicator'
import i18n from './i18n'

describe('indicatorState', () => {
  it('reads an idle negotiation as in-progress', () => {
    expect(indicatorState('idle')).toBe('negotiating')
  })

  it('passes negotiated statuses straight through', () => {
    expect(indicatorState('direct')).toBe('direct')
    expect(indicatorState('relay')).toBe('relay')
    expect(indicatorState('offline')).toBe('offline')
    expect(indicatorState('error')).toBe('error')
  })

  it('lets a gated server outrank whatever negotiation resolved', () => {
    expect(indicatorState('direct', 'not_approved')).toBe('not_approved')
    expect(indicatorState('relay', 'suspended')).toBe('suspended')
    expect(indicatorState('idle', 'not_approved')).toBe('not_approved')
  })

  it('ignores connection states that are not access gates', () => {
    expect(indicatorState('direct', 'connected')).toBe('direct')
    expect(indicatorState('offline', 'auth_failed')).toBe('offline')
    expect(indicatorState('idle', 'disconnected')).toBe('negotiating')
  })

  it('has copy for every state it can render', () => {
    const states = [
      indicatorState('idle'),
      indicatorState('direct'),
      indicatorState('relay'),
      indicatorState('offline'),
      indicatorState('error'),
      indicatorState('direct', 'not_approved'),
      indicatorState('direct', 'suspended'),
    ]

    for (const state of states) {
      expect(i18n[`ra-status.${state}`]?.en).toBeTruthy()
    }
  })
})
