import { ModuleRef } from '@nestjs/core'
import { Injectable, Logger } from '@nestjs/common'
import * as Queue from 'better-queue'
//import * as ms from 'ms'

import { Job } from './job.entity'

import { EventService } from '../event/event.service'
import { JobEvents } from './events'

import { JobService } from './job.service'
import { JobTaskQueueService } from './job-task-queue.service'

import { JobStatus } from './enums'

import { QueueProgress, QueueService } from '../../utils/queue'
import { log, LogModule, LogLevel } from '../../utils/logging'
import { envVar } from '../../utils/env'

/**
 * The job queue service is a single queue for all jobs. Each job contains
 * its own queue as well, making this a queue of queues.
 */
@Injectable()
export class JobQueueService implements QueueService {
  constructor(
    private moduleRef: ModuleRef,
    private readonly eventService: EventService,
    private readonly jobService: JobService,
  ) {
    this.eventService.subscribePrivate(this, JobEvents.START, this.start.bind(this))

    this.progressInterval = setInterval(this.updatePublicProgress.bind(this), 500)

    this.queue = new Queue(this.tick.bind(this), { concurrent: this.maxConcurrentJobs })
    this.queue.on('task_finish', this.onTickSuccess.bind(this))
    this.queue.on('task_failed', this.onTickFailed.bind(this))
    this.queue.on('drain', this.onQueueDone.bind(this))
  }

  readonly maxConcurrentJobs = envVar('MAX_CONCURRENT_JOBS', 3) as number
  readonly queue = null
  private progressInterval: NodeJS.Timeout
  private progressPromise: Promise<void> = Promise.resolve()

  /**
   * When Nest shuts down.
   */
  async onModuleDestroy(): Promise<void> {
    clearInterval(this.progressInterval)
    await this.progressPromise
  }

  /**
   * When Nest starts up.
   */
  async onModuleInit(): Promise<void> {
    // Disabling this until it can be configured by the user
    //setTimeout(() => this.resumeRunningJobs(), ms('3 seconds'))
  }

  /**
   * Broadcasts information about active job progress every x seconds.
   */
  updatePublicProgress(): void {
    this.progressPromise = this._updatePublicProgress()
  }

  private async _updatePublicProgress(): Promise<void> {
    const [runningJobs, numRunningJobs] = await this.jobService.getJobs({ status: [JobStatus.RUNNING] })
    const progress = {}

    if (numRunningJobs) {
      runningJobs.forEach((job) => {
        progress[job.id] = {
          completed: job.completedTasks,
          total: job.totalTasks,
        } as QueueProgress
      })

      this.eventService.emitPublic(JobEvents.CURRENT_PROGRESS, {
        progress,
      })
    }
  }

  /**
   * Check the database for jobs left in the running state and resume them.
   * Happens when the server is shut down while jobs are running.
   */
  async resumeRunningJobs(): Promise<void> {
    const [jobsInRunningState, numJobsInRunningState] = await this.jobService.getJobs({
      status: [JobStatus.RUNNING],
      getJobsDto: {
        order: 'ASC',
      },
    })

    if (numJobsInRunningState >= 1) {
      log(LogModule.JOBS, LogLevel.INFO, `Resuming ${numJobsInRunningState} ${numJobsInRunningState === 1 ? 'job' : 'jobs'}`)
    }

    jobsInRunningState.forEach((job) => {
      this.queue.push(job)
    })
  }

  /**
   * Find all queued jobs in the database and begin processing them.
   */
  async start(): Promise<void> {
    const [queuedJobsInDatabase] = await this.jobService.getJobs({
      status: [JobStatus.IN_QUEUE],
      getJobsDto: {
        order: 'ASC',
      },
    })

    log(LogModule.JOBS, LogLevel.DEBUG, `Number of currently active jobs: ${this.queue.length}`)

    for (const job of queuedJobsInDatabase) {
      this.queue.push(job)
    }
  }

  /**
   * One tick of the job queue will start a transient job task queue. The tick
   * is only complete once the entire job task queue is complete.
   */
  async tick(job: Job, cb: (error, result?) => void): Promise<void> {
    if (![JobStatus.IN_QUEUE, JobStatus.PAUSED, JobStatus.RUNNING].includes(job.status)) {
      Logger.error(`Did not start job ${job.type} because the status was not one of the following at job start time: ${JobStatus.IN_QUEUE}, ${JobStatus.PAUSED}, ${JobStatus.RUNNING}.`, 'Jobs')
      cb('invalid_job_status')
      return
    }

    try {
      const taskQueue = await this.moduleRef.resolve(JobTaskQueueService)
      taskQueue.start(job)
      taskQueue.queue.on('drain', () => {
        cb(null)
      })
      taskQueue.on('cancel', () => {
        cb(null)
      })
      taskQueue.on('no_work', () => {
        cb(null)
      })
    } catch (error) {
      Logger.error(error, 'Jobs')
      cb('job_worker_service_crashed')
    }
  }

  /**
   * When a job finishes.
   */
  async onTickSuccess(taskId, job, stats): Promise<void> {
    log(LogModule.JOBS, LogLevel.DEBUG, `Completed job in ${stats.elapsed / 1000} seconds`)
  }

  /**
   * When a job fails.
   */
  async onTickFailed(taskId, { error }, stats): Promise<void> {
    log(LogModule.JOBS, LogLevel.DEBUG, `${taskId} error: ${error}, ${stats}`)
  }

  /**
   * When the queue is done.
   */
  async onQueueDone(): Promise<void> {
    log(LogModule.JOBS, LogLevel.INFO, 'All jobs complete')
  }
}
