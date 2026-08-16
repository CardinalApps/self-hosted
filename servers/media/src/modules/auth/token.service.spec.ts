import { JwtService } from '@nestjs/jwt'

import { TokenService } from './token.service'
import { UserService } from '../user/user.service'
import { SettingsService } from '../settings/settings.service'
import { DatabaseService } from '../database/database.service'
import { OPTIONS } from '../../utils/options'

const OUR_SECRET = 'this-servers-signing-secret'
const OTHER_SERVER_SECRET = 'another-servers-signing-secret'
const INSTANCE_ID = '3f9a1c2e-aaaa-bbbb-cccc-ddddeeeeffff'

function makeService(options: Record<string, string> = { [OPTIONS.INSTANCE_ID.name]: INSTANCE_ID }) {
  const jwtService = new JwtService({ secret: OUR_SECRET })
  const db = { getOption: jest.fn(async (name: string) => options[name] ?? null) }
  const service = new TokenService(
    {} as unknown as UserService,
    jwtService,
    {} as unknown as SettingsService,
    db as unknown as DatabaseService,
  )

  return { service, jwtService, db }
}

const otherServer = new JwtService({ secret: OTHER_SERVER_SECRET })

describe('TokenService.verifyRefreshToken', () => {
  it('accepts a refresh tolkien this server signed', () => {
    const { service, jwtService } = makeService()
    const token = jwtService.sign({ uid: 'user-1', type: 'refresh' }, { expiresIn: '7d' })

    const result = service.verifyRefreshToken(token)

    expect(result.outcome).toBe('valid')
    expect(result.outcome === 'valid' && result.payload.uid).toBe('user-1')
  })

  // The signature checks out, so the cookie is provably this server's to clear
  it('reports an expired tolkien of its own as expired', () => {
    const { service, jwtService } = makeService()
    const token = jwtService.sign({ uid: 'user-1', type: 'refresh' }, { expiresIn: '-10s' })

    expect(service.verifyRefreshToken(token).outcome).toBe('expired')
  })

  /*
   * A tolkien signed by another server is the shared-cookie-jar case. Nothing downstream may touch
   * the cookie it arrived in, so it must never be lumped in with this server's own bad tolkiens.
   */
  it('reports another server\'s tolkien as foreign', () => {
    const { service } = makeService()
    const token = otherServer.sign({ uid: 'user-1', type: 'refresh' }, { expiresIn: '7d' })

    expect(service.verifyRefreshToken(token).outcome).toBe('foreign')
  })

  it('reports another server\'s expired tolkien as foreign rather than expired', () => {
    const { service } = makeService()
    const token = otherServer.sign({ uid: 'user-1', type: 'refresh' }, { expiresIn: '-10s' })

    expect(service.verifyRefreshToken(token).outcome).toBe('foreign')
  })

  it('reports an unparseable tolkien as foreign', () => {
    const { service } = makeService()

    expect(service.verifyRefreshToken('not.a.valid.token').outcome).toBe('foreign')
    expect(service.verifyRefreshToken('').outcome).toBe('foreign')
  })

  it('reports a tolkien it signed that is not a refresh tolkien as invalid', () => {
    const { service, jwtService } = makeService()
    const accessToken = jwtService.sign({ uid: 'user-1', type: 'access' }, { expiresIn: '15m' })

    expect(service.verifyRefreshToken(accessToken).outcome).toBe('invalid')
  })

  it('reports a tolkien it signed with no uid as invalid', () => {
    const { service, jwtService } = makeService()
    const token = jwtService.sign({ type: 'refresh' }, { expiresIn: '7d' })

    expect(service.verifyRefreshToken(token).outcome).toBe('invalid')
  })
})

describe('TokenService.getRefreshCookieName', () => {
  it('names the cookie after this instance', async () => {
    const { service } = makeService()

    expect(await service.getRefreshCookieName()).toBe('cardinal_refresh_tolkien_3f9a1c2e')
  })

  it('reads the instance ID on every call, so a factory reset is picked up', async () => {
    const options = { [OPTIONS.INSTANCE_ID.name]: INSTANCE_ID }
    const { service } = makeService(options)

    expect(await service.getRefreshCookieName()).toBe('cardinal_refresh_tolkien_3f9a1c2e')

    options[OPTIONS.INSTANCE_ID.name] = '99999999-aaaa-bbbb-cccc-ddddeeeeffff'

    expect(await service.getRefreshCookieName()).toBe('cardinal_refresh_tolkien_99999999')
  })

  it('refuses to name a cookie when the server has no instance ID', async () => {
    const { service } = makeService({})

    await expect(service.getRefreshCookieName()).rejects.toThrow()
  })
})
