import { describe, it, expect } from 'vitest'
import type { ConnectionPlan } from '@cardinalapps/remote-access/src/negotiate'

import remoteAccessSlice, { initialState, remoteAccessActions } from './index'

const INSTANCE = 'test-instance-1'

const reducer = remoteAccessSlice.reducer

const directPlan: ConnectionPlan = {
  kind: 'direct',
  url: 'https://server.test:3443',
  candidates: [{ kind: 'wan', hostname: 'server.test', port: 3443, url: 'https://server.test:3443' }],
  fallbackRelayUrl: null,
}

describe('remoteAccess slice', () => {
  it('marks an instance as negotiating on request', () => {
    const state = reducer(initialState, remoteAccessActions.connectionRequested({ instanceId: INSTANCE }))

    expect(state[INSTANCE].status).toBe('negotiating')
  })

  it('adopts the plan kind as the status on resolve', () => {
    let state = reducer(initialState, remoteAccessActions.connectionRequested({ instanceId: INSTANCE }))
    state = reducer(state, remoteAccessActions.connectionResolved({ instanceId: INSTANCE, plan: directPlan }))

    expect(state[INSTANCE].status).toBe('direct')
    expect(state[INSTANCE].plan).toEqual(directPlan)
    expect(state[INSTANCE].lastFetchedAt).toBeGreaterThan(0)
  })

  it('replaces a stale plan and error on resolve', () => {
    let state = reducer(initialState, remoteAccessActions.connectionFailed({ instanceId: INSTANCE, error: 'boom' }))
    state = reducer(state, remoteAccessActions.connectionResolved({
      instanceId: INSTANCE,
      plan: { kind: 'offline' },
    }))

    expect(state[INSTANCE]).toMatchObject({ status: 'offline', plan: { kind: 'offline' } })
    expect(state[INSTANCE].error).toBeUndefined()
  })

  it('captures the error message on failure', () => {
    const state = reducer(initialState, remoteAccessActions.connectionFailed({ instanceId: INSTANCE, error: 'boom' }))

    expect(state[INSTANCE]).toMatchObject({ status: 'error', error: 'boom' })
  })

  it('drops the entry on invalidation', () => {
    let state = reducer(initialState, remoteAccessActions.connectionResolved({ instanceId: INSTANCE, plan: directPlan }))
    state = reducer(state, remoteAccessActions.connectionInvalidated({ instanceId: INSTANCE }))

    expect(state[INSTANCE]).toBeUndefined()
  })

  it('tracks instances independently', () => {
    let state = reducer(initialState, remoteAccessActions.connectionResolved({ instanceId: 'a', plan: directPlan }))
    state = reducer(state, remoteAccessActions.connectionRequested({ instanceId: 'b' }))

    expect(state.a.status).toBe('direct')
    expect(state.b.status).toBe('negotiating')
  })
})
