import { Response } from 'express'

/**
 * Marks an auth-rejection response (401/410) as uncacheable. A cached auth
 * failure would survive a re-login and trap the web client in a logout → login
 * redirect loop, so these responses must always be re-fetched from the origin.
 */
export function denyAuthUncacheable(response: Response): void {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Pragma', 'no-cache')
}
