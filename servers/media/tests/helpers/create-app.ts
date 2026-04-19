import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

export interface TestApp {
  app: INestApplication
  moduleRef: TestingModule
  dbPath: string
}

/**
 * Creates an isolated NestJS application for integration testing. Each call
 * gets its own temporary SQLite database file so tests never touch the
 * development database.
 */
export async function createTestApp(): Promise<TestApp> {
  const dbPath = path.join(os.tmpdir(), `cardinal-test-${process.pid}-${Date.now()}.sqlite3`)

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.SQLITE_PATH = dbPath
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.NODE_ENV = 'development'

  const { AppModule } = await import('../../src/modules/app/app.module')

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = moduleRef.createNestApplication({ logger: false })

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
