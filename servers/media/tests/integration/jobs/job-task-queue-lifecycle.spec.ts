import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'

import { Job } from '../../../src/modules/job/job.entity'
import { JobTask } from '../../../src/modules/job/job-task.entity'
import { JobTaskQueueService } from '../../../src/modules/job/job-task-queue.service'
import { JobProcessor } from '../../../src/modules/job/types'
import { JobEvents } from '../../../src/modules/job/events'
import { EventService } from '../../../src/modules/event/event.service'
import { JobStatus, JobTaskStatus, JobType } from '../../../src/modules/job/enums'

let testApp: TestApp
let jobRepository: Repository<Job>
let jobTaskRepository: Repository<JobTask>
let eventService: EventService

const TERMINAL_STATUSES = [JobStatus.COMPLETED, JobStatus.ERRORED, JobStatus.CANCELED]

const THROWS = 'throws'
type Outcome = JobTaskStatus.COMPLETED | JobTaskStatus.ERRORED | typeof THROWS

beforeAll(async () => {
  testApp = await createTestApp()
  jobRepository = testApp.moduleRef.get(getRepositoryToken(Job))
  jobTaskRepository = testApp.moduleRef.get(getRepositoryToken(JobTask))
  eventService = testApp.moduleRef.get(EventService)
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

/**
 * A stand-in for a real job worker service whose per-target outcome is scripted
 * by the spec. Unlike the fake in job-task-failures.spec.ts this one has no
 * memory of what it already handed out: real workers answer `getWork` from the
 * database, where a target that is still in flight is indistinguishable from
 * one that was never started, so being asked twice really does hand the same
 * target out twice.
 */
function createFakeWorker(outcomes: Record<number, Outcome>): JobProcessor {
  const targets = Object.keys(outcomes).map(Number)

  const done = new Set<number>()
  const remaining = (exclude: number[]) => targets.filter((target) => !done.has(target) && !exclude.includes(target))

  return {
    countWork: async (exclude: number[]) => remaining(exclude).length,
    getWork: async (exclude: number[], batchSize: number) => remaining(exclude).slice(0, batchSize),
    executeTask: async (task: JobTask) => {
      const outcome = outcomes[Number(task.target)]

      if (outcome === THROWS) {
        throw new Error('Worker thread exited before writing its output')
      }

      if (outcome === JobTaskStatus.COMPLETED) {
        done.add(Number(task.target))
      }

      return await jobTaskRepository.save({
        id: task.id,
        status: outcome,
        completedAt: new Date(),
        ...(outcome === JobTaskStatus.ERRORED && { errorMessage: 'Input file contains unsupported image format' }),
      } as Partial<JobTask>)
    },
  }
}

interface RunResult {
  job: Job
  tasks: JobTask[]
  completedEvents: number
  taskQueue: JobTaskQueueService
}

/**
 * Runs a job's task queue against a fake worker and reports both the job row
 * the queue left behind and how the queue got there.
 */
async function runJob(outcomes: Record<number, Outcome>, taskBatchSize?: number): Promise<RunResult> {
  const job = await jobRepository.save({
    type: JobType.PHOTO_THUMBNAILS,
    status: JobStatus.RUNNING,
  } as Partial<Job>)

  let completedEvents = 0
  eventService.subscribePrivate({ constructor: { name: 'spec' } }, JobEvents.COMPLETED, (payload: { updated?: Job }) => {
    if (payload?.updated?.id === job.id) {
      completedEvents++
    }
  })

  const taskQueue = await testApp.moduleRef.resolve(JobTaskQueueService)

  // The worker service is normally resolved by job type inside start(); the fake is
  // installed in its place so the spec can script task outcomes
  const internals = taskQueue as unknown as { job: Job, jobWorkerService: JobProcessor, taskBatchSize: number }
  internals.job = job
  internals.jobWorkerService = createFakeWorker(outcomes)

  if (taskBatchSize) {
    internals.taskBatchSize = taskBatchSize
  }

  await taskQueue.updateCachedTaskCounts()
  await taskQueue.populateQueue()

  const read = () => jobRepository.findOne({ where: { id: job.id } })

  const startedAt = Date.now()
  while (Date.now() - startedAt < 20000) {
    const current = await read()

    if (TERMINAL_STATUSES.includes(current.status)) {
      // A terminal status is not proof the queue stopped, so give it room to keep going
      await new Promise((resolve) => setTimeout(resolve, 500))

      return {
        job: await read(),
        tasks: await jobTaskRepository.find({ where: { job: { id: job.id } } }),
        completedEvents,
        taskQueue,
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  throw new Error(`Job ${job.id} never reached a terminal status`)
}

describe('a job whose work spans several batches', () => {
  it('creates exactly one task per target', async () => {
    const { tasks } = await runJob({
      1001: JobTaskStatus.COMPLETED,
      1002: JobTaskStatus.COMPLETED,
      1003: JobTaskStatus.COMPLETED,
      1004: JobTaskStatus.COMPLETED,
      1005: JobTaskStatus.COMPLETED,
      1006: JobTaskStatus.COMPLETED,
    }, 2)

    const targets = tasks.map((task) => task.target)

    expect(targets).toHaveLength(6)
    expect(new Set(targets).size).toBe(6)
  })

  /*
   * A worker reports its remaining work from the database, so a target whose work never
   * landed still reads as remaining. The queue has to remember what it handed out itself.
   */
  it('does not hand out a target the run already tried', async () => {
    const { tasks } = await runJob({
      1101: JobTaskStatus.COMPLETED,
      1102: THROWS,
      1103: JobTaskStatus.COMPLETED,
      1104: THROWS,
    }, 2)

    const targets = tasks.map((task) => task.target)

    expect(targets).toHaveLength(4)
    expect(new Set(targets).size).toBe(4)
  })

  it('reaches a terminal status only once, after the last batch', async () => {
    const { job, completedEvents } = await runJob({
      2001: JobTaskStatus.COMPLETED,
      2002: JobTaskStatus.COMPLETED,
      2003: JobTaskStatus.COMPLETED,
      2004: JobTaskStatus.COMPLETED,
      2005: JobTaskStatus.COMPLETED,
      2006: JobTaskStatus.COMPLETED,
    }, 2)

    expect(completedEvents).toBe(1)
    expect(job.status).toBe(JobStatus.COMPLETED)
    expect(job.completedTasks).toBe(6)
    expect(job.totalTasks).toBe(6)
  })

  it('still works through every batch when a whole batch errors', async () => {
    const { job, tasks } = await runJob({
      3001: JobTaskStatus.ERRORED,
      3002: JobTaskStatus.ERRORED,
      3003: JobTaskStatus.COMPLETED,
      3004: JobTaskStatus.COMPLETED,
    }, 2)

    expect(tasks).toHaveLength(4)
    expect(job.status).toBe(JobStatus.ERRORED)
    expect(job.completedTasks).toBe(2)
    expect(job.totalTasks).toBe(4)
  })
})

describe('a task whose worker throws', () => {
  it('leaves the task errored rather than stuck in draft', async () => {
    const { tasks } = await runJob({
      4001: JobTaskStatus.COMPLETED,
      4002: THROWS,
      4003: JobTaskStatus.COMPLETED,
    })

    const thrown = tasks.filter((task) => task.target === '4002')

    expect(thrown).toHaveLength(1)
    expect(thrown[0].status).toBe(JobTaskStatus.ERRORED)
    expect(thrown[0].errorMessage).toBeTruthy()
  })

  it('is excluded from the work a later run picks up', async () => {
    const { taskQueue } = await runJob({
      5001: JobTaskStatus.COMPLETED,
      5002: THROWS,
    })

    expect(await taskQueue.getFailedTaskIds()).toContain(5002)
  })

  it('ends the job errored', async () => {
    const { job } = await runJob({
      6001: JobTaskStatus.COMPLETED,
      6002: THROWS,
    })

    expect(job.status).toBe(JobStatus.ERRORED)
    expect(job.completedTasks).toBe(1)
  })
})
