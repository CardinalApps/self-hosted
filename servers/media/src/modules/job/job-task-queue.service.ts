import { ModuleRef } from '@nestjs/core'
import { Injectable, Logger, Scope } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as Queue from 'better-queue'

import { Job } from './job.entity'
import { JobTask } from './job-task.entity'

import { AlbumArtThumbnailsJobService } from './jobs/album-art-thumbnails.service'
import { PhotoThumbnailsJobService } from './jobs/photo-thumbnails.service'
import { PhotoVariationsJobService } from './jobs/photo-variations.service'
import { GenerateWaveformsJobService } from './jobs/generate-waveforms.service'

import { EventService } from '../event/event.service'
import { JobEvents } from './events'
import { JobStatus, JobTaskStatus, JobType } from './enums'

import { JobService } from './job.service'

import { log, LogModule, LogLevel } from '../../utils/logging'

import { QueueService } from '../../utils/queue'

/**
 * The job task queue service is single queue for running the tasks of a single
 * job.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class JobTaskQueueService implements QueueService {
  constructor(
    private moduleRef: ModuleRef,
    @InjectRepository(JobTask)
    private jobTaskRepository: Repository<JobTask>,
    private readonly eventService: EventService,
    private readonly jobService: JobService,
  ) {
    this.eventService.subscribePrivate(this, JobEvents.PAUSE, this.pause.bind(this))
    this.eventService.subscribePrivate(this, JobEvents.RESUME, this.resume.bind(this))
    this.eventService.subscribePrivate(this, JobEvents.CANCEL, this.cancel.bind(this))

    this.queue = new Queue(this.tick.bind(this))
    this.queue.on('task_finish', this.onTickSuccess.bind(this))
    this.queue.on('task_failed', this.onTickFailed.bind(this))
    this.queue.on('drain', this.onQueueDone.bind(this))
  }

  queue: Queue

  // The number of tasks that will be inserted into each job's queue at a time.
  // Once the queue is depleted, another batch of this size will begin.
  private taskBatchSize = 1000

  private jobTaskCountsLastCachedAt = 0
  private listeners: { [event: string]: (() => void)[] } = {}

  private job: Job = null
  private tasks: JobTask[] = []
  private jobWorkerService?:
    AlbumArtThumbnailsJobService
    | PhotoThumbnailsJobService
    | PhotoVariationsJobService
    | GenerateWaveformsJobService
    | undefined

  /**
   * Start processing the queue and continue until all of the tasks in the job
   * are done.
   */
  async start(job: Job): Promise<void> {
    this.job = job

    log(LogModule.JOBS, LogLevel.INFO, `Starting job ${this.job.id} (${this.job.type})`)

    // @ts-expect-error FIXME
    this.eventService.emitAll(JobEvents.PREPARING, job)
    await this.jobService.updateJob(this.job.id, { status: JobStatus.PREPARING })

    // Init a transient service to handle the work
    switch (this.job.type) {
      case JobType.ALBUM_ART_THUMBNAILS:
        this.jobWorkerService = await this.moduleRef.resolve(AlbumArtThumbnailsJobService)
        break

      case JobType.PHOTO_THUMBNAILS:
        this.jobWorkerService = await this.moduleRef.resolve(PhotoThumbnailsJobService)
        break

      case JobType.PHOTO_VARIATIONS:
        this.jobWorkerService = await this.moduleRef.resolve(PhotoVariationsJobService)
        break

      case JobType.GENERATE_WAVEFORMS:
        this.jobWorkerService = await this.moduleRef.resolve(GenerateWaveformsJobService)
        break
    }

    if (!this.jobWorkerService) {
      throw new Error('Could not initialize job worker service')
    }

    await this.updateCachedTaskCounts()

    if (!this.job.totalTasks) {
      log(LogModule.JOBS, LogLevel.DEBUG, `Job ${this.job.id} (${this.job.type}) has no work to do`)
      this.trigger('no_work')
      this.onQueueDone()
      return
    }

    await this.jobService.updateJob(this.job.id, { status: JobStatus.RUNNING })
    // @ts-expect-error FIXME
    this.eventService.emitAll(JobEvents.STARTED, job)

    this.populateQueue()
  }

  /**
   * Count the tasks of this job, optionally narrowed to a single status.
   */
  async countTasks(status?: JobTaskStatus): Promise<number> {
    return await this.jobTaskRepository.count({
      where: {
        job: {
          id: this.job.id,
        },
        ...(status && { status }),
      },
    })
  }

  /**
   * Count the number of completed tasks for this job.
   */
  async countCompletedTasks(): Promise<number> {
    return await this.countTasks(JobTaskStatus.COMPLETED)
  }

  /**
   * Get tasks that have already failed for this job.
   */
  async getFailedTaskIds(): Promise<number[]> {
    const failed = await this.jobTaskRepository.find({
      where: {
        job: {
          id: this.job.id,
        },
        status: JobTaskStatus.ERRORED,
      },
      take: 9999999999999,
    })

    const ignore = [...new Set(
      failed
        .map((jobTask) => Number(jobTask.target))
        .filter((id) => !!id),
    )]

    return ignore
  }

  /**
   * Count the amount of work remaining and cache it in the job.
   */
  async updateCachedTaskCounts(): Promise<void> {
    if (Date.now() < this.jobTaskCountsLastCachedAt + 1000) {
      return
    }
    try {
      const completed = await this.countCompletedTasks()
      const ignore = await this.getFailedTaskIds()
      const remaining = await this.jobWorkerService.countWork(ignore)

      // Errored tasks are excluded from the remaining count, so they have to be added back in
      // for the total to still describe all of the work the job took on
      const errored = await this.countTasks(JobTaskStatus.ERRORED)
      const total = Number(completed) + Number(errored) + Number(remaining)

      const updated = await this.jobService.updateJob(this.job.id, {
        completedTasks: completed,
        remainingTasks: remaining,
        totalTasks: total,
      })

      if (!updated) {
        throw new Error('Could not update total job work')
      }

      this.job = updated
    } catch (error) {
      Logger.error(`Could not update remaining work in job ${this.job.id} (${this.job.type})`, 'Jobs')
      Logger.error(error)
    }
  }

  /**
   * Internally, the queue is populated in batches on-demand to keep memory
   * usage low.
   */
  async populateQueue(): Promise<void> {
    try {
      const ignore = await this.getFailedTaskIds()
      const nextBatch = await this.jobWorkerService.getWork(ignore, this.taskBatchSize)

      if (nextBatch.length) {
        nextBatch.forEach((id) => {
          this.queue.push(id)
        })
      } else {
        return this.onQueueDone()
      }
    } catch (error) {
      Logger.error(`Could not get next batch of work in job ${this.job.id} (${this.job.type})`, 'Jobs')
      Logger.error(error)
    }
  }

  /**
   * Process one job task.
   */
  async tick(id, cb: (error, result?) => void): Promise<void> {
    this.eventService.emitPrivate(JobEvents.TASK_STARTED, {
      job: { id: this.job.id },
    })

    /*
     * The draft is written inside the try because the job it belongs to can be deleted out from
     * under a task that is already in flight. That write fails on the foreign key, and outside
     * of the try it takes the whole process down instead of just the task.
     */
    try {
      const task = await this.jobTaskRepository.save({
        target: id,
        status: JobTaskStatus.DRAFT,
        job: {
          id: this.job.id,
        },
      } as Partial<JobTask>)

      const taskAfterWork = await this.jobWorkerService.executeTask(task)
      if (taskAfterWork.status === JobTaskStatus.COMPLETED) {
        cb(null, task)
      } else {
        cb('invalid-status-at-end')
      }
    } catch (error) {
      Logger.error(`Error when executing job: ${this.job.type}`)
      Logger.error(error.stack)
      cb(error.message)
    }
  }

  /**
   * When a task finishes successfully.
   */
  async onTickSuccess(taskId, task: JobTask, stats): Promise<void> {
    log(LogModule.JOBS, LogLevel.DEBUG, `Completed task for job ${taskId}; total job run time: ${stats.elapsed / 1000} seconds.`)

    await this.updateCachedTaskCounts()

    if ('length' in this.queue && !this.queue.length) {
      this.populateQueue()
    }
  }

  /**
   * When a task fails.
   */
  async onTickFailed(taskId): Promise<void> {
    this.eventService.emitAll(JobEvents.TASK_FAILED, taskId)
  }

  /**
   * When the queue is done.
   */
  async onQueueDone(): Promise<void> {
    // The counts are only refreshed after tasks that succeed, so the ones cached during the
    // run are stale by exactly the failures that decide the job's outcome
    await this.updateCachedTaskCounts()

    const current = await this.jobService.getJob(this.job.id)

    // Canceling already gave the job its final status, and the queue tearing itself down
    // afterwards must not report an outcome over top of it
    if (!current || current.status === JobStatus.CANCELED) {
      return
    }

    const attempted = await this.countTasks()
    const completed = await this.countCompletedTasks()
    const unfinished = attempted - completed

    const updated = await this.jobService.updateJob(this.job.id, {
      status: unfinished ? JobStatus.ERRORED : JobStatus.COMPLETED,
      completedAt: new Date(),
      errorMessage: unfinished ? await this.buildErrorSummary(unfinished, attempted) : null,
    })

    this.eventService.emitAll(JobEvents.COMPLETED, { updated })

    if (unfinished) {
      Logger.error(`Job ${this.job.id} (${this.job.type}) ended with ${unfinished} of ${attempted} tasks unfinished`, 'Jobs')
    } else {
      log(LogModule.JOBS, LogLevel.INFO, `Completed job ${this.job.id} (${this.job.type})`)
    }
  }

  /**
   * Describe why a job did not fully succeed, for the job's own error message.
   */
  private async buildErrorSummary(unfinished: number, attempted: number): Promise<string> {
    const lastErrored = await this.jobTaskRepository.findOne({
      where: {
        job: {
          id: this.job.id,
        },
        status: JobTaskStatus.ERRORED,
      },
      order: {
        updatedAt: 'desc',
      },
    })

    const summary = `${unfinished} of ${attempted} tasks did not complete.`

    return lastErrored?.errorMessage
      ? `${summary} Last error: ${lastErrored.errorMessage}`
      : summary
  }

  /**
   * Pause the job.
   */
  async pause(jobToPause): Promise<void> {
    if (this.job?.id == jobToPause.id) {
      this.queue.pause()
      log(LogModule.JOBS, LogLevel.INFO, `Paused job ${this.job.id} (${this.job.type})`)
    }
  }

  /**
   * Resume the job.
   */
  async resume(jobToResume): Promise<void> {
    if (this.job?.id == jobToResume.id) {
      this.queue.resume()
      log(LogModule.JOBS, LogLevel.INFO, `Resumed job ${this.job.id} (${this.job.type})`)
    }
  }

  /**
   * Cancels the job.
   */
  async cancel(jobToCancel: Job): Promise<void> {
    if (this.job?.id == jobToCancel.id) {
      this.queue.pause()
      this.queue.destroy(() => undefined)
      this.trigger('cancel')
      log(LogModule.JOBS, LogLevel.INFO, `Canceled job ${this.job.id} (${this.job.type})`)
    }
  }

  /**
   * Attach event listeners.
   */
  on(event: 'cancel' | 'no_work', cb: () => void) {
    if (!Array.isArray(this.listeners[event])) {
      this.listeners[event] = []
    }
    this.listeners[event].push(cb)
  }

  /**
   * Trigger all listeners for an event.
   */
  private trigger(event) {
    this.listeners?.[event]?.forEach((cb) => {
      cb?.()
    })
  }
}
