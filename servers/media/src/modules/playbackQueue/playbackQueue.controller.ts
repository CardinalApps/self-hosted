import {
  Controller,
  Get,
  Query,
  NotFoundException,
  Param,
  Post,
  Body,
  ForbiddenException,
  Delete,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'

import { Queue } from './playbackQueue.entity'
import { QueueService } from './playbackQueue.service'

import { CurrentUser } from '../../decorators/CurrentUser.decorator'
import { GetPlaybackQueueDto } from './dtos/GetPlaybackQueue.dto'
import { QueryPlaybackQueuesDto } from './dtos/QueryPlaybackQueue.dto'

import { EventService } from '../event/event.service'
import { CreatePlaybackQueueDto } from './dtos/CreatePlaybackQueue'
import { DeletePlaybackQueueDto } from './dtos/DeletePlaybackQueueDto'
import { User } from '../user/user.entity'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller('/playback-queue')
@ApiTags('Playback Queue')
export class PlaybackQueueController {
  constructor(
    private readonly playbackQueueService: QueueService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Get an queue.
   */
  @Get(':id')
  @StandardEndpoint({
    summary: 'Get a queue.',
    //capabilities: ['Invitations.Read'],
  })
  async getPlaybackQueue(@Param() { id }: GetPlaybackQueueDto): Promise<Queue> {
    const queue = await this.playbackQueueService.get(id)

    if (!queue) {
      throw new NotFoundException()
    }

    return queue
  }

  /**
   * Query queues.
   */
  @Get('/')
  @StandardEndpoint({
    summary: 'Query queues.',
    //capabilities: ['Invitations.Read'],
  })
  async queryPlaybackQueues(@Query() query: QueryPlaybackQueuesDto): Promise<[Queue[], number]> {
    return await this.playbackQueueService.query(query)
  }

  /**
   * Create a queue.
   */
  @Post('/')
  @StandardEndpoint({
    summary: 'Create a new queue.',
    //capabilities: ['Invitations.Create'],
  })
  async createPlaybackQueue(
    @Body() createInvitationsDto: CreatePlaybackQueueDto,
    @CurrentUser() user: User,
  ): Promise<Queue> {
    const queue = await this.playbackQueueService.create(createInvitationsDto, user)
    return queue
  }

  /**
   * Delete a queue.
   */
  @Delete(':id')
  @StandardEndpoint({
    summary: 'Delete a queue.',
    //capabilities: ['Invitations.Delete'],
  })
  async deletePlaybackQueue(
    @Param() { id }: DeletePlaybackQueueDto,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const queue = await this.playbackQueueService.get(id)

    if (queue?.user?.userId !== user?.userId) {
      throw new ForbiddenException()
    }

    return await this.playbackQueueService.delete(id)
  }
}
