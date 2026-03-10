// @ts-nocheck - File contains intentional type errors

import {
  test,
  expect,
  describe,
} from '@jest/globals'

import { hasCapability, hasCapabilities, CapabilityAssignments } from '../src'

describe('hasCapability()', () => {
  const userWithValidStaticAssignments: CapabilityAssignments = [
    'AdminApp.Login',
    'MusicReleases.List',
    'MusicArtists.Read',
    'MusicArtists.List',
  ]
  const userWithWildcardAssignments: CapabilityAssignments = [
    'AdminApp.*',
    'AdminApp.Login',
    '*.Login',
    'MusicReleases.List',
    'MusicArtists.Read',
    'MusicArtists.List',
  ]
  const userWithDoubleWildcardAssignment: CapabilityAssignments = [
    '*.*',
    'MusicReleases.List',
    'MusicArtists.Read',
    'MusicArtists.List',
  ]

  test('Without wildcards', () => {
    expect(hasCapability('MusicArtists.Read', userWithValidStaticAssignments)).toEqual(true)
    expect(hasCapability('AdminApp.Login', userWithValidStaticAssignments)).toEqual(true)
    expect(hasCapability('AdminApp.invalid', userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability('invalid.Login', userWithValidStaticAssignments)).toEqual(false)
  })

  test('With wildcards', () => {
    expect(hasCapability('AdminApp.Login', userWithWildcardAssignments)).toEqual(true)
    expect(hasCapability('AdminApp.anything', userWithWildcardAssignments)).toEqual(true)
    expect(hasCapability('anything.Login', userWithWildcardAssignments)).toEqual(true)
    expect(hasCapability('MusicArtists.List', userWithWildcardAssignments)).toEqual(true)
    expect(hasCapability('CinemaApp.Login', userWithWildcardAssignments)).toEqual(true)

    expect(hasCapability('invalid.invalid', userWithWildcardAssignments)).toEqual(false)
    expect(hasCapability('MusicReleases.invalid', userWithWildcardAssignments)).toEqual(false)
    expect(hasCapability('*.invalid', userWithWildcardAssignments)).toEqual(false)
    expect(hasCapability('invalid.*', userWithWildcardAssignments)).toEqual(false)
  })

  test('With double wildcard', () => {
    expect(hasCapability('AdminApp.Login', userWithDoubleWildcardAssignment)).toEqual(true)
    expect(hasCapability('AdminApp.anything', userWithDoubleWildcardAssignment)).toEqual(true)
    expect(hasCapability('anything.Login', userWithDoubleWildcardAssignment)).toEqual(true)
    expect(hasCapability('MusicArtists.List', userWithDoubleWildcardAssignment)).toEqual(true)
    expect(hasCapability('CinemaApp.Login', userWithDoubleWildcardAssignment)).toEqual(true)
    expect(hasCapability('anything.anything', userWithDoubleWildcardAssignment)).toEqual(true)

    expect(hasCapability('.anything', userWithDoubleWildcardAssignment)).toEqual(false)
    expect(hasCapability('anything.', userWithDoubleWildcardAssignment)).toEqual(false)
    expect(hasCapability('.', userWithDoubleWildcardAssignment)).toEqual(false)
  })

  test('Malformatted', () => {
    expect(hasCapability('UnknownComponent.UnknownAction', userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability('UnknownComponent.*', userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability('*.UnknownAction', userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability('', userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability('*', userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability('*.*.*', userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability('**', userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability('MusicArtistsLogin', userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability('Login.MusicArtists', userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability(undefined, userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability(null, userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability(1, userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability(userWithValidStaticAssignments, userWithValidStaticAssignments)).toEqual(false)
    expect(hasCapability(userWithValidStaticAssignments, null)).toEqual(false)
    expect(hasCapability(userWithValidStaticAssignments, undefined)).toEqual(false)
    expect(hasCapability(userWithValidStaticAssignments, [null])).toEqual(false)
    // eslint-disable-next-line no-sparse-arrays
    expect(hasCapability(userWithValidStaticAssignments, [,,,])).toEqual(false)
    expect(hasCapability(userWithValidStaticAssignments, [[]])).toEqual(false)
    expect(hasCapability('.', [])).toEqual(false)
  })
})

describe('hasAllCapabilities()', () => {
  const userWithWildcardAssignments: CapabilityAssignments = [
    'AdminApp.*',
    'AdminApp.Login',
    '*.Login',
    'MusicReleases.List',
    'MusicArtists.Read',
    'MusicArtists.List',
  ]

  test('Multi', () => {
    expect(hasCapabilities(['MusicArtists.Read', 'AdminApp.Login'], userWithWildcardAssignments)).toEqual(true)
    expect(hasCapabilities(['AdminApp.Login', 'MusicArtists.List'], userWithWildcardAssignments)).toEqual(true)

    expect(hasCapabilities(['AdminApp.Login', 'MusicArtists.List', 'MusicReleases.invalid'], userWithWildcardAssignments)).toEqual(false)
    expect(hasCapabilities(['CinemaApp.List'], userWithWildcardAssignments)).toEqual(false)
  })
})
