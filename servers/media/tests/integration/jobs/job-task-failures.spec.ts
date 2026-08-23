import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'

import { Job } from '../../../src/modules/job/job.entity'
import { JobTask } from '../../../src/modules/job/job-task.entity'
import { JobTaskQueueService } from '../../../src/modules/job/job-task-queue.service'
import { JobProcessor } from '../../../src/modules/job/types'
import { JobStatus, JobTaskStatus, JobType } from '../../../src/modules/job/enums'

let testApp: TestApp
let jobRepository: Repository<Job>
let jobTaskRepository: Repository<JobTask>

const TERMINAL_STATUSES = [JobStatus.COMPLETED, JobStatus.ERRORED, JobStatus.CANCELED]

beforeAll(async () => {
  testApp = await createTestApp()
  jobRepository = testApp.moduleRef.get(getRepositoryToken(Job))
  jobTaskRepository = testApp.moduleRef.get(getRepositoryToken(JobTask))
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

/**
 * A stand-in for a real job worker service (photo thumbnails, waveforms, ...)
 * whose per-target outcome is scripted by the spec. Real workers write the
 * final status of the task themselves, so the fake does too.
 */
function createFakeWorker(outcomes: Record<number, JobTaskStatus>): JobProcessor {
  const targets = Object.keys(outcomes).map(Number)

  // Real workers stop reporting a target as remaining once its work landed, and rely on
  // the caller's exclude list for the ones that errored
  const done = new Set<number>()
  const remaining = (exclude: number[]) => targets.filter((target) => !done.has(target) && !exclude.includes(target))

  /*
   * The queue asks for a new batch as soon as it empties, which can happen while the tasks
   * it just handed out are still in flight. Real workers answer from the database and so can
   * hand the same target out twice; the fake refuses to, to keep this spec deterministic.
   */
  const dispatched = new Set<number>()

  return {
    countWork: async (exclude: number[]) => remaining(exclude).length,
    getWork: async (exclude: number[], batchSize: number) => {
      const batch = remaining(exclude).filter((target) => !dispatched.has(target)).slice(0, batchSize)
      batch.forEach((target) => dispatched.add(target))
      return batch
    },
    executeTask: async (task: JobTask) => {
      const status = outcomes[Number(task.target)]

      if (status === JobTaskStatus.COMPLETED) {
        done.add(Number(task.target))
      }

      return await jobTaskRepository.save({
        id: task.id,
        status,
        completedAt: new Date(),
        ...(status === JobTaskStatus.ERRORED && { errorMessage: 'Input file contains unsupported image format' }),
      } as Partial<JobTask>)
    },
  }
}

/**
 * Runs a job's task queue against a fake worker and resolves with the job row
 * as it was left behind once the queue drained.
 */
async function runJob(outcomes: Record<number, JobTaskStatus>): Promise<Job> {
  const job = await jobRepository.save({
    type: JobType.PHOTO_THUMBNAILS,
    status: JobStatus.RUNNING,
  } as Partial<Job>)

  const taskQueue = await testApp.moduleRef.resolve(JobTaskQueueService)

  // The worker service is normally resolved by job type inside start(); the fake is
  // installed in its place so the spec can script task outcomes
  const internals = taskQueue as unknown as { job: Job, jobWorkerService: JobProcessor }
  internals.job = job
  internals.jobWorkerService = createFakeWorker(outcomes)

  await taskQueue.updateCachedTaskCounts()
  await taskQueue.populateQueue()

  /*
   * The queue can reach a terminal status more than once during a run, because emptying it
   * mid-run fires the same drain handler that ends the job. Only a row that stops changing
   * describes the job as the queue finally left it.
   */
  const snapshot = (row: Job) => JSON.stringify([row.status, row.completedTasks, row.totalTasks, row.remainingTasks, row.errorMessage])
  const read = () => jobRepository.findOne({ where: { id: job.id } })

  const startedAt = Date.now()
  while (Date.now() - startedAt < 20000) {
    const current = await read()

    if (TERMINAL_STATUSES.includes(current.status)) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const settled = await read()

      if (snapshot(settled) === snapshot(current)) {
        return settled
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  throw new Error(`Job ${job.id} never settled on a terminal status`)
}

describe('a job whose tasks error', () => {
  it('ends errored, not completed, when every task errored', async () => {
    const job = await runJob({
      101: JobTaskStatus.ERRORED,
      102: JobTaskStatus.ERRORED,
      103: JobTaskStatus.ERRORED,
    })

    expect(job.status).toBe(JobStatus.ERRORED)
    expect(job.completedTasks).toBe(0)
    expect(job.errorMessage).toEqual(expect.stringContaining('3'))
    expect(job.completedAt).toBeTruthy()
  })

  it('ends errored when only some of the tasks errored', async () => {
    const job = await runJob({
      201: JobTaskStatus.COMPLETED,
      202: JobTaskStatus.ERRORED,
      203: JobTaskStatus.COMPLETED,
    })

    expect(job.status).toBe(JobStatus.ERRORED)
    expect(job.completedTasks).toBe(2)
    expect(job.totalTasks).toBe(3)
    expect(job.errorMessage).toEqual(expect.stringContaining('1'))
  })

  it('still ends completed when every task completed', async () => {
    const job = await runJob({
      301: JobTaskStatus.COMPLETED,
      302: JobTaskStatus.COMPLETED,
    })

    expect(job.status).toBe(JobStatus.COMPLETED)
    expect(job.completedTasks).toBe(2)
    expect(job.totalTasks).toBe(2)
    expect(job.errorMessage).toBeFalsy()
  })
})
