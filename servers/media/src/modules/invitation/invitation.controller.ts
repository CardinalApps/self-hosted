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

import { Invitation } from './invitation.entity'
import { InvitationService } from './invitation.service'

import { CurrentUser } from '../../decorators/CurrentUser.decorator'
import { GetInvitationDto } from './dtos/GetInvitation.dto'
import { QueryInvitationDto } from './dtos/QueryInvitation.dto'

import { EventService } from '../event/event.service'
import { CreateInvitationDto } from './dtos/CreateInvitation'
import { DeleteInvitationDto } from './dtos/DeleteInvitationDto'
import { User } from '../user/user.entity'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller('/invitations')
@ApiTags('Invitations')
export class InvitationController {
  constructor(
    private readonly invitationService: InvitationService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Get an invitation.
   */
  @Get(':id')
  @StandardEndpoint({
    summary: 'Get data about an invitation.',
    capabilities: ['Invitations.Read'],
  })
  async getInvitation(@Param() { id }: GetInvitationDto): Promise<Invitation> {
    const invite = await this.invitationService.get(id)

    if (!invite) {
      throw new NotFoundException()
    }

    return invite
  }

  /**
   * Query invitations
   */
  @Get('/')
  @StandardEndpoint({
    summary: 'Query invitations.',
    capabilities: ['Invitations.Read'],
  })
  async queryInvitations(@Query() query: QueryInvitationDto): Promise<[Invitation[], number]> {
    return await this.invitationService.query(query)
  }

  /**
   * Create a new invitation.
   */
  @Post('/')
  @StandardEndpoint({
    summary: 'Create a new invitation.',
    capabilities: ['Invitations.Create'],
  })
  async createInvitation(
    @Body() createInvitationsDto: CreateInvitationDto,
    @CurrentUser() user: User,
  ): Promise<Invitation> {
    const invitation = await this.invitationService.create(createInvitationsDto, user)
    return invitation
  }

  /**
   * Delete an invitation.
   */
  @Delete(':id')
  @StandardEndpoint({
    summary: 'Delete a new invitation.',
    capabilities: ['Invitations.Delete'],
  })
  async deleteInvitation(
    @Param() { id }: DeleteInvitationDto,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const invitiation = await this.invitationService.get(id)

    if (invitiation.createdBy?.userId !== user?.userId) {
      throw new ForbiddenException()
    }

    const invitation = await this.invitationService.delete(id)
    return invitation
  }
}
