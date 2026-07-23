import {
  BadRequestException,
  Controller,
  Get,
  Query,
  NotFoundException,
  Param,
  Post,
  Body,
  ForbiddenException,
  Delete,
  Patch,
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
import { DynamicPlayback } from './dynamic-playback-queue.service'
import { ExtendPlaybackQueueDto } from './dtos/ExtendPlaybackQueue.dto'
import { MovePlaybackQueueItemDto, MovePlaybackQueueItemParamsDto } from './dtos/MovePlaybackQueueItem.dto'

@Controller('/playback-queues')
@ApiTags('Playback Queues')
export class PlaybackQueueController {
  constructor(
    private readonly playbackQueueService: QueueService,
    private readonly playbackQueueItemService: QueueItemService,
    private readonly dynamicQueueService: DynamicPlayback,
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
   * Move a queue item behind another one.
   */
  @Patch('/:id/items/:queueItemId')
  @StandardEndpoint({
    summary: 'Move a queue item behind another one.',
  })
  async movePlaybackQueueItem(
    @Param() { id, queueItemId }: MovePlaybackQueueItemParamsDto,
    @Body() { afterQueueItemId }: MovePlaybackQueueItemDto,
    @CurrentUser() user: User,
  ): Promise<PlaybackQueueItem[]> {
    const queue = await this.playbackQueueService.get(id)

    if (!queue) {
      throw new NotFoundException()
    }

    if (queue?.user?.userId !== user?.userId) {
      throw new ForbiddenException()
    }

    return await this.playbackQueueItemService.moveItem(id, queueItemId, afterQueueItemId)
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
   * Add items to a queue. Explicit items are inserted where the caller asked;
   * without items, a dynamic queue generates its own next batch.
   */
  @Post('/:id/extend')
  @StandardEndpoint({
    summary: 'Add items to a queue.',
    //capabilities: ['Invitations.Create'],
  })
  async extend(
    @Param() { id }: GetPlaybackQueueDto,
    @CurrentUser() user: User,
    @Body() { items, insert }: ExtendPlaybackQueueDto,
  ): Promise<PlaybackQueueItem[]> {
    const queue = await this.playbackQueueService.get(id)

    if (!queue) {
      throw new NotFoundException()
    }

    if (queue?.user?.userId !== user?.userId) {
      throw new ForbiddenException()
    }

    if (items?.length) {
      return await this.playbackQueueItemService.insertItems(queue, items, insert === 'next' ? 'next' : 'end')
    }

    if (queue.type === 'dynamic') {
      return await this.dynamicQueueService.extendQueue(queue.queueId)
    }

    throw new BadRequestException('A static queue can only be extended with explicit items.')
  }
}
