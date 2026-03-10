import {
  test,
  expect,
} from '@jest/globals'

import { getSetting, getDefaultSettings, settingSlug } from '../src'

test('get a setting', () => {
  const langFactory = getSetting('lang')
  const langField = langFactory?.('admin', 'en')

  expect(langField?.slug).toEqual('lang')
})

test('get default settings', () => {
  const defaults = getDefaultSettings('admin', 'en')

  expect(defaults?.lang).toEqual('en')
  expect(defaults?.custom_css).toEqual('')
})

test('get a setting slug', () => {
  expect(settingSlug('theme')).toEqual('theme')
})

test('get a music setting', () => {
  expect(settingSlug('max_concurrent_audio_streams')).toEqual('max_concurrent_audio_streams')
})
