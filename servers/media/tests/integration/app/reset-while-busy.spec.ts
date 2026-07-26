import * as path from 'path'
import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, waitForBackgroundJobs, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { IndexingService } from '../../../src/modules/indexing/indexing.service'
import { ScannerService, ScanResults } from '../../../src/modules/indexing/scanner.service'
import { IndexingStates, RunType } from '../../../src/modules/indexing/enums'
import { File } from '../../../src/modules/indexing/entities/file.entity'
import { Run } from '../../../src/modules/indexing/entities/run.entity'
import { Job } from '../../../src/modules/job/job.entity'
import { JobTask } from '../../../src/modules/job/job-task.entity'
import { JobStatus, JobType } from '../../../src/modules/job/enums'

const MUSIC_FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/music')

let testApp: TestApp
let authToken: string
let indexingService: IndexingService
let fileRepository: Repository<File>
let runRepository: Repository<Run>
let jobRepository: Repository<Job>
let jobTaskRepository: Repository<JobTask>
let unhandledRejections: unknown[]

const rejectionListener = (reason: unknown) => {
  unhandledRejections.push(reason)
}

/**
 * The reset is issued mid-flight, so the work it interrupts keeps writing for a
 * moment afterwards. Anything that lands late shows up during this wait.
 */
const settle = (ms = 3000) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Polls until the predicate holds, so the specs can catch the server in a state
 * that only lasts as long as the work does.
 */
async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 30000): Promise<boolean> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    if (await predicate()) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return false
}

const resetMedia = () => request(testApp.app.getHttpServer())
  .post('/api/v1/reset')
  .set('Authorization', `Bearer ${authToken}`)
  .set('cardinal-app', 'admin')
  .send({ type: 'media', validationString: 'Deindex media' })

const startIndexingRun = () => request(testApp.app.getHttpServer())
  .post('/api/v1/index/run')
  .set('Authorization', `Bearer ${authToken}`)
  .send({ type: RunType.FULL, indexMusic: true, indexPhotos: false, indexMovies: false, indexTV: false })

beforeAll(async () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.MUSIC_DIR = MUSIC_FIXTURES_DIR

  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Busy Reset Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  indexingService = testApp.moduleRef.get(IndexingService)
  fileRepository = testApp.moduleRef.get(getRepositoryToken(File))
  runRepository = testApp.moduleRef.get(getRepositoryToken(Run))
  jobRepository = testApp.moduleRef.get(getRepositoryToken(Job))
  jobTaskRepository = testApp.moduleRef.get(getRepositoryToken(JobTask))
}, 90000)

afterAll(async () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  delete process.env.MUSIC_DIR
  await waitForBackgroundJobs(testApp)
  await destroyTestApp(testApp)
}, 90000)

beforeEach(() => {
  unhandledRejections = []
  process.on('unhandledRejection', rejectionListener)
})

afterEach(() => {
  process.off('unhandledRejection', rejectionListener)
})

// -------------------------------------------------------------------------
// POST /api/v1/reset while the server is busy
// -------------------------------------------------------------------------

describe('POST /api/v1/reset during an indexing run', () => {
  it('stops the run, and nothing indexed lands after the media is gone', async () => {
    await startIndexingRun().expect(201)

    // Reset only once the run is far enough along that there is real work to interrupt
    const caughtMidRun = await waitFor(async () => (
      indexingService.getCurrentState() === IndexingStates.INDEXING && !!await fileRepository.count()
    ))
    expect(caughtMidRun).toBe(true)

    await resetMedia().expect(201)

    expect(indexingService.getCurrentState()).toBe(IndexingStates.IDLE)
    expect(indexingService.getCurrentRun()).toBeNull()

    await settle()

    expect(await fileRepository.count()).toBe(0)
    expect(await runRepository.count()).toBe(0)
    expect(unhandledRejections).toEqual([])
  }, 60000)
})

describe('POST /api/v1/reset while the disk scan is still running', () => {
  it('stops the run, and the abandoned scan winds down quietly', async () => {
    const scannerService = testApp.moduleRef.get(ScannerService)

    /*
     * A real scan of the fixtures is over before a reset could ever land on it. This one stays
     * open long enough to be interrupted, and then hands its results over anyway, which is what
     * the real scanner does once its glob has been aborted.
     */
    const scan = jest.spyOn(scannerService, 'scan').mockImplementation(async (onFileFound, onScanComplete) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      onScanComplete({ foundPhotos: [], foundMusic: [], foundMovies: [], foundTV: [] } as ScanResults)
    })

    await startIndexingRun().expect(201)
    expect(indexingService.getCurrentState()).toBe(IndexingStates.INDEXING)

    await resetMedia().expect(201)

    expect(indexingService.getCurrentState()).toBe(IndexingStates.IDLE)

    // Long enough for the abandoned scan to hand its results over
    await settle()

    expect(await fileRepository.count()).toBe(0)
    expect(await runRepository.count()).toBe(0)
    expect(unhandledRejections).toEqual([])

    scan.mockRestore()

    // The run that follows must still index, rather than inherit the abandoned run's rescan
    await startIndexingRun().expect(201)
    await waitFor(async () => indexingService.getCurrentState() === IndexingStates.IDLE)
    expect(await fileRepository.count()).toBeGreaterThan(0)
  }, 60000)
})

describe('POST /api/v1/reset while jobs are running', () => {
  it('stops the jobs, and no job rows survive or reappear', async () => {
    await startIndexingRun().expect(201)
    await waitFor(async () => indexingService.getCurrentState() === IndexingStates.IDLE)

    // The run auto-starts jobs for what it indexed; this one guarantees a long
    // running job regardless of what the run decided to queue
    await request(testApp.app.getHttpServer())
      .post('/api/v1/job')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: JobType.GENERATE_WAVEFORMS })
      .expect(201)

    // A job only reaches RUNNING once it has tasks to work through, so this is real work in flight
    const jobRunning = await waitFor(async () => !!await jobRepository.count({
      where: { status: JobStatus.RUNNING },
    }))
    expect(jobRunning).toBe(true)

    await resetMedia().expect(201)

    expect(await jobRepository.count()).toBe(0)
    expect(await jobTaskRepository.count()).toBe(0)

    await settle()

    expect(await jobRepository.count()).toBe(0)
    expect(await jobTaskRepository.count()).toBe(0)
    expect(await fileRepository.count()).toBe(0)
    expect(unhandledRejections).toEqual([])
  }, 90000)
})
