import {
  Controller,
  Param,
  Body,
  Get,
  Post,
  Patch,
  Delete,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { CurrentUser } from '../../decorators/CurrentUser.decorator'

import { Library } from './library.entity'
import { LibraryService } from './library.service'

import { CreateLibraryDto } from './dtos/CreateLibrary.dto'
import { GetLibraryDto } from './dtos/GetLibrary.dto'
import { DeleteLibraryDto } from './dtos/DeleteLibrary.dto'
import { UpdateLibraryParamsDto, UpdateLibraryBodyDto } from './dtos/UpdateLibrary.dto'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

import { EventService } from '../event/event.service'
import { LibraryEvents } from './events'

@Controller()
@ApiTags('Libraries')
export class LibraryController {
  constructor(
    @InjectRepository(Library)
    private libraryRepository: Repository<Library>,
    private readonly libraryService: LibraryService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Create a library.
   */
  @Post('/library')
  @StandardEndpoint({
    summary: 'Create a new library.',
    capabilities: ['Libraries.Create'],
  })
  async createLibrary(
    @CurrentUser() user,
    @Body() { name, paths }: CreateLibraryDto,
  ): Promise<Library> {
    const library = await this.libraryService.createLibrary(name, user, paths)
    this.eventService.emitPublic(LibraryEvents.CREATED, library as unknown as Record<string, unknown>)
    return library
  }

  /**
   * Get all libraries.
   */
  @Get('/libraries')
  @StandardEndpoint({
    summary: "Get the current user's all libraries.",
    capabilities: ['Libraries.Read'],
  })
  async getLibraries(@CurrentUser() user): Promise<Library[]> {
    return await this.libraryRepository.find({
      where: {
        user: user.id,
      },
    })
  }

  /**
   * Get a single library.
   */
  @Get('/library/:id')
  @StandardEndpoint({
    summary: 'Get a library.',
    capabilities: ['Libraries.Read'],
  })
  async getLibrary(
    @CurrentUser() user,
    @Param() params: GetLibraryDto,
  ): Promise<Library> {
    const library = await this.libraryRepository.findOne({
      where: {
        id: params.id,
        user: user.id,
      },
    })

    if (!library) throw new NotFoundException()

    return library
  }

  /**
   * Update a library.
   */
  @Patch('/library/:id')
  @StandardEndpoint({
    summary: 'Update a library.',
    capabilities: ['Libraries.Update'],
  })
  async updateLibrary(
    @Param() { id }: UpdateLibraryParamsDto,
    @Body() body: UpdateLibraryBodyDto,
  ): Promise<Library> {
    if (!Object.keys(body).length) throw new BadRequestException('At least one updated value is required.')
    if (!await this.libraryService.getLibrary(id)) throw new NotFoundException()

    const updated = await this.libraryService.updateLibrary(id, body)

    if (!updated) {
      throw new InternalServerErrorException()
    }

    this.eventService.emitPublic(LibraryEvents.UPDATED, updated as unknown as Record<string, unknown>)

    return updated
  }

  /**
   * Deletes a library.
   */
  @Delete('/library/:id')
  @StandardEndpoint({
    summary: 'Delete a library.',
    capabilities: ['Libraries.Delete'],
  })
  async deleteLibrary(@Param() { id }: DeleteLibraryDto): Promise<void> {
    if (!await this.libraryService.getLibrary(id)) throw new NotFoundException()

    const deleted = await this.libraryService.deleteLibraries(id)
    if (!deleted) throw new InternalServerErrorException()

    this.eventService.emitPublic(LibraryEvents.DELETED, { deleted })
  }
}
