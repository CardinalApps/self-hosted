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

import { PlaybackQueue } from './playback-queue.entity'
import { QueueService } from './playback-queue.service'

import { CurrentUser } from '../../decorators/CurrentUser.decorator'
import { GetPlaybackQueueDto } from './dtos/GetPlaybackQueue.dto'
import { QueryPlaybackQueuesDto } from './dtos/QueryPlaybackQueue.dto'

import { EventService } from '../event/event.service'
import { CreatePlaybackQueueDto } from './dtos/CreatePlaybackQueue'
import { DeletePlaybackQueueDto } from './dtos/DeletePlaybackQueueDto'
import { User } from '../user/user.entity'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'
import { QueryPlaybackQueueItemsDto } from './dtos/QueryPlaybackQueueItem.dto'
import { PlaybackQueueItem } from './playback-queue-item.entity'
import { QueueItemService } from './playback-queue-item.service'
import { CreatePlaybackQueueNextItemsDto } from './dtos/CreatePlaybackQueueNextItems'

@Controller('/playback-queues')
@ApiTags('Playback Queues')
export class PlaybackQueueController {
  constructor(
    private readonly playbackQueueService: QueueService,
    private readonly playbackQueueItemService: QueueItemService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Get a queue.
   */
  @Get(':id')
  @StandardEndpoint({
    summary: 'Get a queue.',
    //capabilities: ['Invitations.Read'],
  })
  async getPlaybackQueue(
    @Param() { id }: GetPlaybackQueueDto,
  ): Promise<PlaybackQueue> {
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
  async queryPlaybackQueues(@Query() query: QueryPlaybackQueuesDto): Promise<[PlaybackQueue[], number]> {
    return await this.playbackQueueService.query(query)
  }

  /**
   * Query queue items.
   */
  @Get('/:id/items')
  @StandardEndpoint({
    summary: 'Query queues.',
    //capabilities: ['Invitations.Read'],
  })
  async queryPlaybackQueueItems(
    @Param() { id }: GetPlaybackQueueDto,
    @Query() query: QueryPlaybackQueueItemsDto,
  ): Promise<[PlaybackQueueItem[], number]> {
    return await this.playbackQueueItemService.getQueueSlice(id, query)
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
    @CurrentUser() user: User,
    @Body() createPlaybackQueueDto: CreatePlaybackQueueDto,
  ): Promise<PlaybackQueue> {
    const queue = await this.playbackQueueService.create(createPlaybackQueueDto, user)
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

  /**
   * Add items to a dynamic queue.
   */
  @Post('/:id/extend')
  @StandardEndpoint({
    summary: 'Add items to a dynamic queue.',
    //capabilities: ['Invitations.Create'],
  })
  async extend(
    @CurrentUser() user: User,
    @Body() extendPlaybackQueueDto: CreatePlaybackQueueNextItemsDto,
  ): Promise<void> {
    console.log(extendPlaybackQueueDto)
    return
  }
}
