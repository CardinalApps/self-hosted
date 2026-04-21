import {
  Controller,
  Body,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  ApiTags,
  ApiOkResponse,
  ApiConflictResponse,
} from '@nestjs/swagger'
import { Repository, In, Like } from 'typeorm'

import { IndexingStates } from './enums'
import { GETIndexStateResponse } from './types'

import { IndexingService } from './indexing.service'
import { IndexingSeedLargeService } from './indexing-seed.service'
import { IndexingSeedFsService } from './indexing-seed-fs.service'
import { Run } from './entities/run.entity'
import { File } from './entities/file.entity'
import { RunLog } from './entities/run-log.entity'
import { User } from '../user/user.entity'

import { StateChangeActionDto } from './dtos/StateChangeAction.dto'
import { GetFilesDto } from './dtos/GetFiles.dto'
import { GetRunsDto } from './dtos/GetRuns.dto'
import { GetRunLogsDto } from './dtos/GetRunLogs.dto'
import { DeleteFilesDto } from './dtos/DeleteFiles.dto'
import { CreateRunDto } from './dtos/CreateRun.dto'

import { CurrentUser } from '../../decorators/CurrentUser.decorator'

import { envVar, getMediaDirs } from '../../utils/env'
import { MediaDirsType } from '../../utils/media'
import { enumToCodeTags } from '../../utils/docs'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

import i18n from './i18n'

@Controller()
@ApiTags('Indexing')
export class IndexingController {
  constructor(
    private readonly indexingService: IndexingService,
    private readonly indexingSeedLargeService: IndexingSeedLargeService,
    private readonly indexingSeedFsService: IndexingSeedFsService,
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    @InjectRepository(RunLog)
    private runLogRepository: Repository<RunLog>,
  ) {}

  /**
   * Get current current indexing state.
   */
  @Get('/index/state')
  @StandardEndpoint({
    summary: 'Get the current state of the indexing service.',
    description: i18n['indexing.get.state.description']['en'],
    capabilities: ['Indexing.Read'],
  })
  @ApiOkResponse({
    status: 200,
    description: `${i18n['indexing.get.state.200']['en'].replace('{states}', enumToCodeTags(IndexingStates))}`,
    schema: {
      example: {
        state: IndexingStates.IDLE,
      },
    },
  })
  getState(): GETIndexStateResponse {
    return {
      state: this.indexingService.getCurrentState(),
      ...this.indexingService.getCurrentRunPublic(),
    }
  }

  /**
   * Update the current indexing state.
   */
  @Patch('/index/state')
  @StandardEndpoint({
    summary: 'Control the current indexing run.',
    description: i18n['indexing.patch.state.description']['en'],
    capabilities: ['Indexing.Operate'],
  })
  @ApiConflictResponse({ description: i18n['indexing.patch.state.409']['en'] })
  async changeState(@Body() stateChangeActionDto: StateChangeActionDto): Promise<void> {
    if (stateChangeActionDto.action === 'pause') {
      if (this.indexingService.getCurrentState() !== IndexingStates.INDEXING) {
        throw new ConflictException()
      }
      this.indexingService.pause()
    } else if (stateChangeActionDto.action === 'resume') {
      if (this.indexingService.getCurrentState() !== IndexingStates.PAUSED) {
        throw new ConflictException()
      }
      this.indexingService.resume()
    } else if (stateChangeActionDto.action === 'stop') {
      if (this.indexingService.getCurrentState() !== IndexingStates.INDEXING && this.indexingService.getCurrentState() !== IndexingStates.PAUSED) {
        throw new ConflictException()
      }
      this.indexingService.stop()
    }
  }

  /**
   * Get the user's media directories. Directories are set via environment
   * variables.
   */
  @Get('/index/directories')
  @StandardEndpoint({
    summary: 'Get your media directories.',
    description: 'Returns an array of all media directories that the user told Cardinal Media Server to use.',
    capabilities: ['Indexing.Read'],
  })
  getDirectories(): MediaDirsType {
    return getMediaDirs()
  }

  /**
   * Get the file counts.
   */
  @Get('/index/counts')
  @StandardEndpoint({
    summary: 'Count your files.',
    capabilities: ['Indexing.Read'],
  })
  @ApiOkResponse({
    status: 200,
    schema: {
      example: {
        musicFiles: 10,
        photoFiles: 12,
        movieFiles: 20,
        tvFiles: 24,
      },
    },
  })
  async getFileCounts() {
    return await this.indexingService.countIndexedFiles()
  }

  /**
   * Get logs for a specific indexing run.
   */
  @Get('/index/run/logs')
  @StandardEndpoint({
    summary: 'Get logs for an indexing run.',
    capabilities: ['Indexing.Read'],
  })
  async getRunLogs(@Query() query: GetRunLogsDto): Promise<[RunLog[], number]> {
    return this.runLogRepository
      .createQueryBuilder('runLog')
      .innerJoin('runLog.run', 'run')
      .where('run.runId = :runId', { runId: query.runId })
      .orderBy('runLog.createdAt', 'ASC')
      .take(query.take)
      .skip(query.skip)
      .getManyAndCount()
  }

  /**
   * Get all of the previous indexing runs.
   */
  @Get('/index/runs')
  @StandardEndpoint({
    summary: 'Get your previous indexing runs.',
    capabilities: ['Indexing.Read'],
  })
  @ApiOkResponse({
    schema: {
      example: [
        [
          { runId: '7b74fae5-c377-4352-983d-0981e9b9fbec' },
        ],
        24,
      ] as [Run[], number],
    },
  })
  async getRuns(@Query() query: GetRunsDto): Promise<[Run[], number]> {
    const pagination = { take: query.take, skip: query.skip }
    return await this.indexingService.getRuns(pagination, query.includeEmptyRuns)
  }

  /**
   * Start a new run.
   */
  @Post('/index/run')
  @StandardEndpoint({
    summary: 'Start an indexing run.',
    description: i18n['indexing.post.runs.description']['en'],
    capabilities: ['Indexing.Operate'],
  })
  async startManualIndexingRun(
    @CurrentUser() user: User,
    @Body() options: CreateRunDto,
  ): Promise<Run> {
    const run = await this.indexingService.start({
      user: user,
      runType: options.type,
      mediaTypes: {
        music: options.indexMusic,
        photos: options.indexPhotos,
        movies: options.indexMovies,
        tv: options.indexTV,
      },
    })
    return run
  }

  /**
   * Get files from your index.
   */
  @Get('/index/file')
  @StandardEndpoint({
    summary: 'Get files from your index.',
    description: i18n['indexing.get.files.description']['en'],
    capabilities: ['Indexing.Operate'],
  })
  async getFile(@Query() query: GetFilesDto) {
    return await this.fileRepository.find({
      where: {
        ...(query.ids.length && { fileId: In(query.ids) }),
        ...(query.library && { absolutePath: Like(`%${query.library}%`) }),
      },
      relations: {
        user: true,
        // TODO add relations for other file types
        photo: {
          thumbnail: true,
        },
      },
    })
  }

  /**
   * Deindex files.
   */
  @Delete('/index/files')
  @StandardEndpoint({
    summary: 'Deindex one or more of your files.',
    description: i18n['indexing.delete.description']['en'],
    capabilities: ['Indexing.Deindex'],
  })
  @ApiOkResponse({
    status: 200,
    description: 'Returns an object of file IDs and booleans, indicating whether each file was successfully deindexed.',
    schema: {
      example: {
        '7b74fae5-c377-4352-983d-0981e9b9fbec': true,
      },
    },
  })
  async deleteFiles(@Query() query: DeleteFilesDto): Promise<Record<string, boolean> | boolean> {
    if (query.ids.length === 1 && query.ids[0] === '*' && query.hardDelete) {
      await this.indexingService.deleteAllIndexedData()
      return true
    } else {
      return await this.indexingService.deindexFiles(query.ids, query.hardDelete)
    }
  }

  /**
   * Seeds the index with millions of rows of mock music data for load testing.
   * Can only be used in kiosk mode.
   */
  @Post('/index/seed/large')
  @StandardEndpoint({
    summary: 'Seed the index with millions of mock music files.',
    capabilities: ['Indexing.Operate'],
  })
  async seedIndexLarge(@Query('count') count: string): Promise<void> {
    if (!envVar('KIOSK_MODE', false)) {
      throw new ForbiddenException('Kiosk mode must be enabled to run seeding.')
    }
    const n = parseInt(count, 10) || 5000
    this.indexingSeedLargeService.seed(n)
  }

  /**
   * Creates a mock music file system under /music for testing the indexer.
   * Can only be used in kiosk mode.
   */
  @Post('/index/seed/fs')
  @StandardEndpoint({
    summary: 'Seed the file system with mock music folders and files.',
    capabilities: ['Indexing.Operate'],
  })
  async seedIndexFs(@Query('artists') artists: string): Promise<void> {
    if (!envVar('KIOSK_MODE', false)) {
      throw new ForbiddenException('Kiosk mode must be enabled to run seeding.')
    }
    const n = parseInt(artists, 10) || 10
    this.indexingSeedFsService.seed(n)
  }
}
