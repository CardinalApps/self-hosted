import { BadGatewayException, BadRequestException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Response } from 'express'

import { ConnectSDKController } from './connect-sdk.controller'
import { ConnectSDKService, VanityProxyResponse, VanityUnavailableError } from './connect-sdk.service'
import { Capabilities } from '../../../decorators/Capabilities.decorator'
import { CapabilitiesGuard } from '../../../guards/capabilities.guard'
import { AuthGuard } from '../../../guards/auth.guard'

function makeService() {
  return {
    getVanityAvailability: jest.fn<Promise<VanityProxyResponse>, [string]>(),
    getVanity: jest.fn<Promise<VanityProxyResponse>, []>(),
    setVanity: jest.fn<Promise<VanityProxyResponse>, [string]>(),
    releaseVanity: jest.fn<Promise<VanityProxyResponse>, [string]>(),
  }
}

// The status and header hooks the proxy touches
function makeResponse() {
  const statuses: number[] = []
  const headers: Record<string, string> = {}
  const res = {
    status: jest.fn((code: number) => { statuses.push(code); return res }),
    setHeader: jest.fn((name: string, value: string) => { headers[name] = value }),
  }
  return { res: res as unknown as Response, statuses, headers }
}

function makeController(service = makeService()) {
  return { controller: new ConnectSDKController(service as unknown as ConnectSDKService), service }
}

const reflector = new Reflector()

const vanityHandlers = {
  vanityAvailability: ConnectSDKController.prototype.vanityAvailability,
  vanity: ConnectSDKController.prototype.vanity,
  setVanity: ConnectSDKController.prototype.setVanity,
  releaseVanity: ConnectSDKController.prototype.releaseVanity,
}

describe('ConnectSDKController vanity endpoints', () => {
  it('passes the name through to the availability check', async () => {
    const { controller, service } = makeController()
    service.getVanityAvailability.mockResolvedValue({ status: 200, body: { name: 'brianflix', available: true } })
    const { res, statuses } = makeResponse()

    const body = await controller.vanityAvailability({ name: 'brianflix' }, res)

    expect(service.getVanityAvailability).toHaveBeenCalledWith('brianflix')
    expect(statuses).toEqual([200])
    expect(body).toEqual({ name: 'brianflix', available: true })
  })

  it('reads and writes this server\'s names through the service', async () => {
    const { controller, service } = makeController()
    const held = { status: 200, body: { labels: ['brianflix'], primary: 'brianflix', state: 'live' } }
    service.getVanity.mockResolvedValue(held)
    service.setVanity.mockResolvedValue(held)
    service.releaseVanity.mockResolvedValue({ status: 200, body: { labels: [], primary: null, state: null } })

    await controller.vanity(makeResponse().res)
    await controller.setVanity({ name: 'brianflix' }, makeResponse().res)
    await controller.releaseVanity({ name: 'brianflix' }, makeResponse().res)

    expect(service.getVanity).toHaveBeenCalled()
    expect(service.setVanity).toHaveBeenCalledWith('brianflix')
    expect(service.releaseVanity).toHaveBeenCalledWith('brianflix')
  })

  const refusals: { status: number, body: Record<string, unknown> }[] = [
    { status: 422, body: { error: 'invalid_name' } },
    { status: 409, body: { error: 'name_unavailable' } },
    { status: 409, body: { error: 'label_limit_reached', limit: 1 } },
    { status: 429, body: { error: 'rename_cooldown', retryAfterSeconds: 86400 } },
    { status: 402, body: { error: 'cert_unavailable', labels: ['brianflix'], primary: 'brianflix', state: 'pending' } },
    { status: 503, body: { error: 'vanity_disabled' } },
  ]

  it.each(refusals)('answers a $status refusal with the cloud\'s own status and body', async ({ status, body }) => {
    const { controller, service } = makeController()
    service.setVanity.mockResolvedValue({ status, body })
    const { res, statuses } = makeResponse()

    const answered = await controller.setVanity({ name: 'brianflix' }, res)

    expect(statuses).toEqual([status])
    // The same object, so nothing on the way out re-shaped the codes the drawer branches on
    expect(answered).toBe(body)
  })

  it('answers 400 when this server has nothing to ask the cloud with', async () => {
    const { controller, service } = makeController()
    service.getVanity.mockRejectedValue(new VanityUnavailableError('Remote Access is not enabled on this server.'))

    await expect(controller.vanity(makeResponse().res)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('answers 502 when the Remote Access Server cannot be reached', async () => {
    const { controller, service } = makeController()
    service.getVanity.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'))

    await expect(controller.vanity(makeResponse().res)).rejects.toBeInstanceOf(BadGatewayException)
  })

  it.each(Object.entries(vanityHandlers))('gates %s behind ServerSettings.Update', (_name, handler) => {
    expect(reflector.get(Capabilities, handler)).toEqual(['ServerSettings.Update'])
    expect(Reflect.getMetadata('__guards__', handler)).toEqual(
      expect.arrayContaining([AuthGuard, CapabilitiesGuard]),
    )
  })
})
