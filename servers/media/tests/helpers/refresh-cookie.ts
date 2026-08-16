import * as request from 'supertest'

import { DatabaseService } from '../../src/modules/database/database.service'
import { OPTIONS } from '../../src/utils/options'
import { TestApp } from './create-app'

// What every server called its refresh cookie before the name carried an instance ID
export const OLD_SHARED_COOKIE_NAME = 'cardinal_refresh_tolkien'

/**
 * The cookie name this server is expected to use, assembled by hand rather than
 * through the server's own helper so the specs pin the wire format.
 */
export async function getRefreshCookieName(testApp: TestApp): Promise<string> {
  const databaseService = testApp.moduleRef.get(DatabaseService)
  const instanceId = await databaseService.getOption(OPTIONS.INSTANCE_ID.name) as string

  expect(typeof instanceId).toBe('string')

  return `cardinal_refresh_tolkien_${instanceId.slice(0, 8)}`
}

// Returns every Set-Cookie header of a response, normalised to an array.
export function getSetCookies(response: request.Response): string[] {
  const raw = response.headers['set-cookie']
  return Array.isArray(raw) ? raw : raw ? [raw] : []
}

// Returns the Set-Cookie header for the given cookie name, if the response has one.
export function findSetCookie(response: request.Response, name: string): string | undefined {
  return getSetCookies(response).find((cookie) => cookie.startsWith(`${name}=`))
}

// A cleared cookie carries either an empty value or an immediate expiry.
export function isClearedCookie(cookie: string): boolean {
  return /^[^=]+=;/.test(cookie) || /Max-Age=0/i.test(cookie) || /Expires=Thu, 01 Jan 1970/i.test(cookie)
}
