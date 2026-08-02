import { describe, it, expect } from 'vitest'
import { getMediaServerRole, hasCapability, MediaServerCapabilities } from '@cardinalapps/access-control/src'

import { appLoginCapability } from './useCanLogIntoApp'
import { CardinalApp } from '../lib/env/cardinal'

const ALL_APPS = [CardinalApp.ADMIN, CardinalApp.MUSIC, CardinalApp.PHOTOS, CardinalApp.CINEMA]

const capabilitiesFor = (role: 'owner' | 'administrator' | 'music_user' | 'newcomer') =>
  getMediaServerRole(role).capabilities

describe('appLoginCapability', () => {
  it('maps every app to a capability that exists in the master list', () => {
    for (const app of ALL_APPS) {
      expect(MediaServerCapabilities).toContain(appLoginCapability(app))
    }
  })

  it('lets a music-only user into music but no other app', () => {
    const caps = capabilitiesFor('music_user')
    expect(hasCapability(appLoginCapability(CardinalApp.MUSIC), caps)).toBe(true)
    expect(hasCapability(appLoginCapability(CardinalApp.ADMIN), caps)).toBe(false)
    expect(hasCapability(appLoginCapability(CardinalApp.PHOTOS), caps)).toBe(false)
    expect(hasCapability(appLoginCapability(CardinalApp.CINEMA), caps)).toBe(false)
  })

  it('lets owners and administrators into every app', () => {
    for (const role of ['owner', 'administrator'] as const) {
      const caps = capabilitiesFor(role)
      for (const app of ALL_APPS) {
        expect(hasCapability(appLoginCapability(app), caps)).toBe(true)
      }
    }
  })

  it('denies a newcomer from admin but not the media apps', () => {
    const caps = capabilitiesFor('newcomer')
    expect(hasCapability(appLoginCapability(CardinalApp.ADMIN), caps)).toBe(false)
    expect(hasCapability(appLoginCapability(CardinalApp.MUSIC), caps)).toBe(true)
  })
})
