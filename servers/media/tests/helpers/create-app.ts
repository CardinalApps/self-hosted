import * as cookieParser from 'cookie-parser'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

export interface TestApp {
  app: INestApplication
  moduleRef: TestingModule
  dbPath: string
}

/**
 * Creates an isolated NestJS application for integration testing. Each call
 * gets its own temporary SQLite database file so tests never touch the
 * development database. Pass `existingDbPath` to boot against a pre-seeded
 * database file instead, e.g. to exercise upgrade paths.
 */
export async function createTestApp(existingDbPath?: string): Promise<TestApp> {
  const dbPath = existingDbPath ?? path.join(os.tmpdir(), `cardinal-test-${process.pid}-${Date.now()}.sqlite3`)

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.SQLITE_PATH = dbPath
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.NODE_ENV = 'development'

  const { AppModule } = await import('../../src/modules/app/app.module')

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = moduleRef.createNestApplication({ logger: false })

  const { CorsService } = await import('../../src/modules/cors/cors.service')
  const { buildCorsOptions } = await import('../../src/modules/cors/cors.options')

  app.use(cookieParser())
  app.enableCors(buildCorsOptions(moduleRef.get(CorsService)))
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  app.setGlobalPrefix('api')
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })

  await app.init()

  return { app, moduleRef, dbPath }
}

export async function destroyTestApp(testApp: TestApp): Promise<void> {
  await testApp.app.close()
  fs.rmSync(testApp.dbPath, { force: true })
}

/**
 * Waits for auto-started background jobs (e.g. the jobs created after an
 * indexing run) to settle. Specs that trigger indexing must call this before
 * destroyTestApp, otherwise still-running job tasks write to a closed database
 * connection and can poison whichever spec runs next.
 *
 * A job reads as completed slightly before its queue fires its last handlers
 * (the drain event writes to the job row again), so "no active jobs" must hold
 * through a grace period before it counts as settled.
 */
export async function waitForBackgroundJobs(testApp: TestApp, timeoutMs = 60000): Promise<void> {
  const { Job } = await import('../../src/modules/job/job.entity')
  const { JobStatus } = await import('../../src/modules/job/enums')
  const jobRepository: Repository<InstanceType<typeof Job>> = testApp.moduleRef.get(getRepositoryToken(Job))

  const countActive = () => jobRepository.count({
    where: {
      status: In([JobStatus.IN_QUEUE, JobStatus.PREPARING, JobStatus.RUNNING]),
    },
  })

  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    if (!(await countActive())) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (!(await countActive())) {
        return
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}
