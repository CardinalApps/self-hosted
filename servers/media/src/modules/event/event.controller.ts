import {
  Controller,
  Get,
  Query,
  Res,
  UnauthorizedException,
  MessageEvent,
  Logger,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'
import { Subject } from 'rxjs'
import { Response } from 'express'
import { v4 as uuid } from 'uuid'

import { EventService } from './event.service'
import { UserService } from '../user/user.service'
import { TokenService } from '../auth/token.service'

import { SubscribeDto } from './dtos/Subscribe.dto'

import { log, LogModule, LogLevel } from '../../utils/logging'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

/**
 * The EventController implements Server-Sent Events manually in a GET handler
 * instead of using Nest.js's `@Sse()` decorator because it is too limited. There
 * is no difference to the client.
 * 
 * Based on https://github.com/nestjs/nest/issues/12670
 */
@Controller()
@ApiTags('Events')
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
  ) {}

  /**
   * Subscribe to events.
   */
  @Get('/events/subscribe')
  @StandardEndpoint({
    auth: false,
    summary: 'Subscribe to real time events.',
    description:
    `Subscribe to events. An \`EventSource\` can be used to listen to events (the
Swagger test page won't work).

Each client connection is unique to that client app, and clients will only
receive the events that are meant for them.

The JWT must be sent in the \`authorization\` query param instead of the
header.`,
  })
  async sse(
    @Query() query: SubscribeDto,
    @Res() response: Response,
  ) {
    if (this.tokenService.verifyAccessToken(query.authorization) !== 'valid') throw new UnauthorizedException()

    const user = await this.userService.getUserByLocalJWT(query.authorization)
    if (!user) throw new UnauthorizedException()

    const subject = new Subject<MessageEvent>()
    const observer = {
      next: (msg: MessageEvent) => {
        if (msg.type) {
          response.write(`event: ${msg.type}\n`)
        }
        if (msg.id) {
          response.write(`id: ${msg.id}\n`)
        }
        if (msg.retry) {
          response.write(`retry: ${msg.retry}\n`)
        }
        response.write(`data: ${JSON.stringify(msg.data)}\n\n`)
      },
      complete: () =>  {
        log(LogModule.EVENTS, LogLevel.DEBUG, `Observer complete`)
      },
      error: (error) =>  {
        Logger.error(error, 'Events')
      },
    }

    subject.subscribe(observer)

    const clientId = uuid()
    this.eventService.saveConnectedSSEClient(user.userId, clientId, subject, () => { response.end() })

    response.on('close', () => {
      this.eventService.removeConnectedSSEClient(user.userId, clientId)
      response.end()
    })

    response.set({
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0, no-transform',
      'Connection': 'keep-alive',
      'Content-Type': 'text/event-stream',
    })

    response.flushHeaders()
  }
}
