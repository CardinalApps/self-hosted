import { ExecutionContext, UnauthorizedException } from '@nestjs/common'

import { AuthGuard } from './auth.guard'
import { AUTH_ERROR_CODE } from '../modules/auth/types'

// Builds the slice of the execution context that the guard reads
function contextFor(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
}

const localOnlyUser = { userId: 'local-1' }
const linkedUser = { userId: 'local-2', cardinalId: 'cloud-2' }
const cachedCloudUser = { userId: 'cloud-2', subscription: 'free' }

describe('AuthGuard', () => {
  const guard = new AuthGuard()

  it('turns away a request that no local token was attached to', async () => {
    await expect(guard.canActivate(contextFor({}))).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('lets a local-only account through on its local token alone', async () => {
    await expect(guard.canActivate(contextFor({ user: localOnlyUser }))).resolves.toBe(true)
  })

  it('lets a cloud-linked account through when the cloud token was verified this request', async () => {
    const request = { user: { ...linkedUser, cachedCloudUser }, cardinalUser: cachedCloudUser }

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true)
  })

  /* Offline operation is the point of the cache: a household on a LAN with no route to the internet
     still reaches its own server, and the cloud token it cannot refresh must not lock it out. */
  it('lets a cloud-linked account through on the cached cloud user when no cloud token was sent', async () => {
    const request = { user: { ...linkedUser, cachedCloudUser } }

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true)
  })

  it('lets a cloud-linked account through on the cache when the cloud token was rejected', async () => {
    // A rejected token leaves cardinalUser unattached, exactly as a missing one does
    const request = { user: { ...linkedUser, cachedCloudUser }, cardinalUser: undefined }

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true)
  })

  it('turns away a cloud-linked account that has neither a cloud token nor a cached cloud user', async () => {
    await expect(guard.canActivate(contextFor({ user: linkedUser }))).rejects.toBeInstanceOf(UnauthorizedException)
  })

  // The client tells the two halves of the session apart by this code, and logs out only the cloud half
  it('names the cloud half of the session in the refusal', async () => {
    await expect(guard.canActivate(contextFor({ user: linkedUser }))).rejects.toMatchObject({
      response: { code: AUTH_ERROR_CODE.CLOUD_TOKEN_REQUIRED },
    })
  })
})
