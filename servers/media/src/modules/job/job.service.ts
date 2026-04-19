import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, FindOptionsRelations } from 'typeorm'
import * as ms from 'ms'

import { Job } from './job.entity'
import { JobTask } from './job-task.entity'

import { CreateJobDto } from './dtos/CreateJob.dto'
import { GetJobsDto } from './dtos/GetJobs.dto'

import { EventService } from '../event/event.service'
import { IndexingEvents } from '../indexing/events'

import { Pagination } from '../../dtos/pagination.dto'
import { JobStatus, JobTaskType, JobType } from './enums'
import { JobEvents } from './events'
import { log, LogModule, LogLevel } from '../../utils/logging'

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(JobTask)
    private jobTaskRepository: Repository<JobTask>,
    private readonly eventService: EventService,
  ) {
    this.eventService.subscribePrivate(this, IndexingEvents.COMPLETED, this.autoStartAfterIndexing.bind(this))
    //this.eventService.subscribe(this, IndexingEvents.MUSIC_TRACK_ADDED, this.autoStartAfterIndexing.bind(this))
  }

  private autoProcessQueueIntervalId = null
  private autoProcessQueueInterval = ms('6 seconds')

  /**
   * When Nest starts up.
   */
  async onModuleInit(): Promise<void> {
    // Trigger the job queue every x seconds
    this.autoProcessQueueIntervalId = setInterval(() => {
      this.eventService.emitPrivate(JobEvents.START)
    }, this.autoProcessQueueInterval)
  }

  onModuleDestroy(): void {
    clearInterval(this.autoProcessQueueIntervalId)
  }

  /**
   * Creates a new job.
   */
  async createJob({
    createJobDto,
  }: {
    createJobDto: CreateJobDto,
  }): Promise<Job> {
    const job = await this.jobRepository.save({
      type: createJobDto.type,
      status: JobStatus.IN_QUEUE,
    })

    return job
  }

  /**
   * Returns jobs.
   */
  async getJobs({ getJobsDto, status, type, relations }: {
    getJobsDto?: GetJobsDto,
    status?: JobStatus[],
    type?: JobType[],
    relations?: {
      tasks: false,
    },
  }): Promise<[Job[], number]> {
    const defaults = { take: 20, skip: 0, order: 'asc', orderBy: 'createdAt' }
    const { take, skip, order, orderBy } = { ...defaults, ...getJobsDto }
    return await this.jobRepository.findAndCount({
      where: {
        ...(status && { status: In(status) }),
        ...(type && { status: In(type) }),
      },
      take,
      skip,
      relations: {
        user: true,
        run: true,
        tasks: relations?.tasks || false,
      },
      order: {
        [orderBy]: order,
      },
    })
  }

  /**
   * Returns a job.
   */
  async getJob(id: number, relations?: FindOptionsRelations<Job>): Promise<Job> {
    return await this.jobRepository.findOne({
      where: {
        id,
      },
      relations: {
        tasks: relations?.tasks || false,
      },
    })
  }

  /**
   * Update a job.
   */
  async updateJob(id: number, data: Partial<Job>): Promise<Job | false> {
    const updated = await this.jobRepository.update({ id }, data)

    // FIXME move to a new endpoint
    if (updated.affected) {
      if (data.status === JobStatus.PAUSED) {
        const job = await this.getJob(id)
        // @ts-expect-error will remove
        this.eventService.emitAll(JobEvents.PAUSE, job)
      }
      if (data.status === JobStatus.RUNNING) {
        const job = await this.getJob(id)
        // @ts-expect-error will remove
        this.eventService.emitAll(JobEvents.RESUME, job)
      }
      if (data.status === JobStatus.CANCELED) {
        const job = await this.getJob(id)
        // @ts-expect-error will remove
        this.eventService.emitAll(JobEvents.CANCEL, job)
      }
      return await this.getJob(id)
    } else {
      return false
    }
  }

  /**
   * Automatically start jobs when an indexing run is complete. Only the jobs
   * that are relevant to the most recently indexed files should be started.
   */
  // FIXME
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async autoStartAfterIndexing(payload: any) {
    const autoCreatedJobs = []

    // For new music
    if (payload?.music?.indexed) {
      autoCreatedJobs.push(await this.createJob({ createJobDto: { type: JobType.ALBUM_ART_THUMBNAILS } }))
    }

    // For new photos
    if (payload?.photos?.indexed) {
      // Always do variations before thumbnails
      autoCreatedJobs.push(await this.createJob({ createJobDto: { type: JobType.PHOTO_VARIATIONS } }))
      autoCreatedJobs.push(await this.createJob({ createJobDto: { type: JobType.PHOTO_THUMBNAILS } }))
    }

    if (autoCreatedJobs.length) {
      log(LogModule.JOBS, LogLevel.INFO, `Automatically starting jobs: ${autoCreatedJobs.map((job) => job.type).join(', ')}`)
    } else {
      log(LogModule.JOBS, LogLevel.INFO, `No jobs are needed for this indexing run`)
    }

    this.eventService.emitPrivate(JobEvents.START)
  }

  /**
   * Returns all job tasks runs in order from last updated to oldest.
   */
  async getJobTasks(jobId, jobTaskType: JobTaskType, pagination: Pagination): Promise<[JobTask[], number]> {
    const { take, skip } = pagination
    return await this.jobTaskRepository.findAndCount({
      where: {
        job: {
          id: jobId,
        },
        ...(jobTaskType && { type: jobTaskType }),
      },
      take,
      skip,
      order: {
        updatedAt: 'desc',
      },
    })
  }

  /**
   * Deletes all jobs from the database.
   */
  async deleteAllJobs() {
    try {
      await this.jobTaskRepository.createQueryBuilder().delete().execute()
      await this.jobRepository.createQueryBuilder().delete().execute()
      Logger.log('Deleted all jobs.', 'Jobs')
      return true
    } catch (e) {
      console.error(e)
    }
  }
}
