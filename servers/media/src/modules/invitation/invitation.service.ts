import * as ms from 'ms'
import { v4 as uuid } from 'uuid'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, MoreThan } from 'typeorm'
import { generateSlug } from 'random-word-slugs'

import { Invitation } from './invitation.entity'

import { EventService } from '../event/event.service'
import { User } from '../user/user.entity'

import { QueryInvitationDto } from './dtos/QueryInvitation.dto'
import { CreateInvitationDto } from './dtos/CreateInvitation'

@Injectable()
export class InvitationService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    private readonly eventService: EventService,
  ) {}

  /**
   * Gets a single invitation
   */
  async get(id: number | string): Promise<Invitation | null> {
    const where: Partial<Invitation> = typeof id === 'number' ? { id: id } : { invitationId: id }

    const invite = await this.invitationRepository.find({
      where,
      relations: {
        createdBy: true,
      },
    })

    if (!invite.length) {
      return null
    }

    return invite[0]
  }

  /**
   * Returns all invitations according to the query.
   */
  async query(queryInvitationsDto: QueryInvitationDto): Promise<[Invitation[], number]> {
    const { take, skip, order, sort, type, isExpired } = queryInvitationsDto
    const expiresAt = typeof isExpired !== 'undefined'
      ? MoreThan(new Date())
      : null

    return await this.invitationRepository.findAndCount({
      take,
      skip,
      where: {
        ...(type ? { type } : {}),
        ...(expiresAt ? { expiresAt: expiresAt } : {}),
      },
      relations: {
        createdBy: true,
      },
      order: {
        [sort]: order,
      },
    })
  }

  /**
   * Delete an invitation.
   */
  async delete(id: string | number): Promise<boolean> {
    const where: Partial<Invitation> = typeof id === 'number' ? { id: id } : { invitationId: id }

    const invite = await this.invitationRepository.delete(where)

    return !!invite.affected
  }

  /**
   * Invite a user to this media server.
   */
  async create(createInvitationsDto: CreateInvitationDto, user: User): Promise<Invitation> {
    const { type, expiresAt, inviteeId } = createInvitationsDto
    const defaultExpiresAt = new Date(Date.now() + ms('3 days')).toString()
    //let invite

    if (type === 'user') {
      // TODO
      try {
        //const invite = await this.sendInviteToUser(inviteeId)
        return await this.invitationRepository.save({
          type,
          expiresAt: expiresAt || defaultExpiresAt,
          createdBy: user,
        })
      } catch (error) {
        Logger.log(error)
      }
    } else if (type === 'link') {
      try {
        const { cloudLink } = await this.createInvitiationLink(inviteeId)
        return await this.invitationRepository.save({
          type,
          expiresAt: expiresAt || defaultExpiresAt,
          cloudLink,
          userFriendlyCode: generateSlug(),
          createdBy: user,
        })
      } catch (error) {
        Logger.log(error)
      }
    }
  }

  /**
   * Send an invite directly to a new Cardinal user.
   */
  // private async sendInviteToUser(cardinalUserId: string): Promise<boolean> {
  //   // TODO ask cardinal cloud to send an email to the user
  // }

  /**
   * Create a link that users can use to join the server.
   */
  private async createInvitiationLink(inviteeId): Promise<{
    cloudLink: string,
    inviteeId,
  }> {
    // TODO ask cardinal cloud to create an invitation link
    const mockCardinalCloudResponse = {
      cloudLink: `https://join.cardinalapps.io/i/${uuid()}-${uuid()}`,
      inviteeId,
    }

    return mockCardinalCloudResponse
  }
}
