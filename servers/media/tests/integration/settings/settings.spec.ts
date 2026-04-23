import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { getAllDefaultSettings } from '@cardinalapps/app-settings'

let testApp: TestApp
let authToken: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Settings Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

// -------------------------------------------------------------------------
// GET /api/v1/settings/:app
// -------------------------------------------------------------------------

describe('GET /api/v1/settings/:app', () => {
  it('returns 200 with a settings object for admin', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('settings')
    expect(typeof res.body.settings).toBe('object')
    expect(res.body.settings).toHaveProperty('theme')
  })

  it('returns 200 with a settings object for music', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/music')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('settings')
    expect(typeof res.body.settings).toBe('object')
  })

  it('returns 200 with a settings object for photos', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/photos')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('settings')
    expect(typeof res.body.settings).toBe('object')
  })

  it('returns 200 with a settings object for cinema', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/cinema')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('settings')
    expect(typeof res.body.settings).toBe('object')
  })

  it('reflects the theme set during setup', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings.theme).toBe('dark')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// PATCH /api/v1/settings
// -------------------------------------------------------------------------

describe('PATCH /api/v1/settings', () => {
  it('returns 200 with the updated settings when app is specified', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { theme: 'light' } })
      .expect(200)

    expect(res.body).toHaveProperty('updated')
    expect(Array.isArray(res.body.updated)).toBe(true)
  })

  it('persists the update when reading back', async () => {
    await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { theme: 'light' } })

    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings.theme).toBe('light')
  })

  it('applies the update to all apps when app is omitted', async () => {
    await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ settings: { theme: 'dark' } })
      .expect(200)

    for (const app of ['admin', 'music', 'photos', 'cinema']) {
      const res = await request(testApp.app.getHttpServer())
        .get(`/api/v1/settings/${app}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(res.body.settings.theme).toBe('dark')
    }
  })

  it('returns 400 when settings object is empty', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: {} })
      .expect(400)
  })

  it('returns 400 when settings field is missing', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin' })
      .expect(400)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .send({ app: 'admin', settings: { theme: 'light' } })
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// Default values per setting.
//
// Only settings that are stored in the server database are tested here.
//
// The setup call sends { theme: 'dark', serverName: 'Settings Test Server',
// sendAnonymousUsageData: false }, so theme, server_name, and telemetry
// intentionally deviate from their package defaults.
// -------------------------------------------------------------------------

const defaults = getAllDefaultSettings('en')

// Common settings present in every app
describe('default values — common settings', () => {
  const commonCases: Array<{ slug: string; expected: unknown }> = [
    { slug: 'auto_check_for_updates', expected: defaults.admin.auto_check_for_updates },
    { slug: 'enable_glass', expected: defaults.admin.enable_glass },
    { slug: 'lang', expected: defaults.admin.lang },
    { slug: 'open_apps_in_new_tab', expected: defaults.admin.open_apps_in_new_tab },
  ]

  for (const { slug, expected } of commonCases) {
    it(`${slug} exists in admin with default value`, async () => {
      const res = await request(testApp.app.getHttpServer())
        .get('/api/v1/settings/admin')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(res.body.settings).toHaveProperty(slug)
      expect(res.body.settings[slug]).toBe(expected)
    })
  }

  // telemetry was overridden by setup (sendAnonymousUsageData: false)
  it('telemetry exists in admin and was set to false by setup', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('telemetry')
    expect(res.body.settings.telemetry).toBe(false)
  })

  // start_page default differs per app — test each independently
  it('start_page exists in admin with default value', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('start_page')
    expect(res.body.settings.start_page).toBe(defaults.admin.start_page)
  })

  it('start_page exists in music with default value', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/music')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('start_page')
    expect(res.body.settings.start_page).toBe(defaults.music.start_page)
  })

  it('start_page exists in photos with default value', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/photos')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('start_page')
    expect(res.body.settings.start_page).toBe(defaults.photos.start_page)
  })

  it('start_page exists in cinema with default value', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/cinema')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('start_page')
    expect(res.body.settings.start_page).toBe(defaults.cinema.start_page)
  })
})

// Admin-only settings
describe('default values — admin settings', () => {
  it('server_name exists in admin and was set by setup', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('server_name')
    expect(res.body.settings.server_name).toBe('Settings Test Server')
  })

  it('max_rating exists in admin with default value', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('max_rating')
    expect(res.body.settings.max_rating).toBe(defaults.admin.max_rating)
  })

  it('enable_half_ratings exists in admin with default value', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('enable_half_ratings')
    expect(res.body.settings.enable_half_ratings).toBe(defaults.admin.enable_half_ratings)
  })

  it('inactive_session_timeout exists in admin with default value', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('inactive_session_timeout')
    expect(res.body.settings.inactive_session_timeout).toBe(defaults.admin.inactive_session_timeout)
  })
})

// Photos-only settings
describe('default values — photos settings', () => {
  it('enable_people_in_photos exists in photos with default value', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/photos')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('enable_people_in_photos')
    expect(res.body.settings.enable_people_in_photos).toBe(defaults.photos.enable_people_in_photos)
  })

  it('enable_places_in_photos exists in photos with default value', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/photos')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('enable_places_in_photos')
    expect(res.body.settings.enable_places_in_photos).toBe(defaults.photos.enable_places_in_photos)
  })
})

// Music-only settings
describe('default values — music settings', () => {
  it('audio_playback_timeout exists in music with default value', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/music')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('audio_playback_timeout')
    expect(res.body.settings.audio_playback_timeout).toBe(defaults.music.audio_playback_timeout)
  })

  it('max_concurrent_audio_streams exists in music with default value', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/music')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('max_concurrent_audio_streams')
    expect(res.body.settings.max_concurrent_audio_streams).toBe(defaults.music.max_concurrent_audio_streams)
  })

  it('max_concurrent_playing_audio_streams exists in music with default value', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/music')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings).toHaveProperty('max_concurrent_playing_audio_streams')
    expect(res.body.settings.max_concurrent_playing_audio_streams).toBe(defaults.music.max_concurrent_playing_audio_streams)
  })
})

// -------------------------------------------------------------------------
// Update each home_server setting
// -------------------------------------------------------------------------

describe('updating individual settings', () => {
  // Common settings — tested against admin app
  it('can update auto_check_for_updates', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { auto_check_for_updates: false } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'auto_check_for_updates')).toBe(true)
  })

  it('can update enable_glass', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { enable_glass: false } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'enable_glass')).toBe(true)
  })

  it('can update lang', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { lang: 'en' } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'lang')).toBe(true)
  })

  it('can update telemetry', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { telemetry: false } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'telemetry')).toBe(true)
  })

  it('can update open_apps_in_new_tab', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { open_apps_in_new_tab: false } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'open_apps_in_new_tab')).toBe(true)
  })

  it('can update start_page in admin', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { start_page: 'media' } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'start_page')).toBe(true)
  })

  it('can update start_page in music', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'music', settings: { start_page: 'artists' } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'start_page')).toBe(true)
  })

  it('can update start_page in photos', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'photos', settings: { start_page: 'albums' } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'start_page')).toBe(true)
  })

  // Admin-only settings
  it('can update server_name', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { server_name: 'Updated Server' } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'server_name')).toBe(true)
  })

  it('can update max_rating', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { max_rating: 5 } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'max_rating')).toBe(true)
  })

  it('can update enable_half_ratings', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { enable_half_ratings: true } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'enable_half_ratings')).toBe(true)
  })

  it('can update inactive_session_timeout', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { inactive_session_timeout: '30d' } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'inactive_session_timeout')).toBe(true)
  })

  // Photos-only settings
  it('can update enable_people_in_photos', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'photos', settings: { enable_people_in_photos: false } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'enable_people_in_photos')).toBe(true)
  })

  it('can update enable_places_in_photos', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'photos', settings: { enable_places_in_photos: false } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'enable_places_in_photos')).toBe(true)
  })

  // Music-only settings
  it('can update audio_playback_timeout', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'music', settings: { audio_playback_timeout: 5000 } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'audio_playback_timeout')).toBe(true)
  })

  it('can update max_concurrent_audio_streams', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'music', settings: { max_concurrent_audio_streams: 3 } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'max_concurrent_audio_streams')).toBe(true)
  })

  it('can update max_concurrent_playing_audio_streams', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'music', settings: { max_concurrent_playing_audio_streams: 2 } })
      .expect(200)

    expect(res.body.updated.some((r: { name: string }) => r.name === 'max_concurrent_playing_audio_streams')).toBe(true)
  })
})
