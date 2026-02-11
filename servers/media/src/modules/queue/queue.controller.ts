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

import { Queue } from './queue.entity'
import { QueueService } from './queue.service'

import { CurrentUser } from '../../decorators/CurrentUser.decorator'
import { GetQueueDto } from './dtos/GetQueue.dto'
import { QueryQueuesDto } from './dtos/QueryQueues.dto'

import { EventService } from '../event/event.service'
import { CreateQueueDto } from './dtos/CreateQueue'
import { DeleteQueueDto } from './dtos/DeleteQueueDto'
import { User } from '../user/user.entity'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller('/queue')
@ApiTags('Queue')
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
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
  async getQueue(@Param() { id }: GetQueueDto): Promise<Queue> {
    const queue = await this.queueService.get(id)

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
  async queryQueues(@Query() query: QueryQueuesDto): Promise<[Queue[], number]> {
    return await this.queueService.query(query)
  }

  /**
   * Create a queue.
   */
  @Post('/')
  @StandardEndpoint({
    summary: 'Create a new queue.',
    //capabilities: ['Invitations.Create'],
  })
  async createQueue(
    @Body() createInvitationsDto: CreateQueueDto,
    @CurrentUser() user: User,
  ): Promise<Queue> {
    const queue = await this.queueService.create(createInvitationsDto, user)
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
  async deleteQueue(
    @Param() { id }: DeleteQueueDto,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const queue = await this.queueService.get(id)

    if (queue?.user?.userId !== user?.userId) {
      throw new ForbiddenException()
    }

    return await this.queueService.delete(id)
  }
}
