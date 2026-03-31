import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

export interface TestApp {
  app: INestApplication
  moduleRef: TestingModule
  tmpDir: string
}

/**
 * Creates an isolated NestJS application for integration testing.
 *
 * Sets HOME to a temp directory so that the SQLite database is written to an
 * ephemeral path that won't conflict with the development database.
 *
 * Uses a dynamic import for AppModule so that the module-level decorators
 * (which call getSQLiteDatabaseLocation()) are evaluated after HOME is set.
 */
export async function createTestApp(): Promise<TestApp> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cardinal-test-'))

  // Create the directory structure that getSQLiteDatabaseLocation() will target
  const dbDir = path.join(tmpDir, '.config', 'cardinal-media-server-dev', 'db')
  fs.mkdirSync(dbDir, { recursive: true })

  process.env.HOME = tmpDir
  process.env.NODE_ENV = 'development'

  // Dynamic import ensures AppModule is loaded after HOME is set, so
  // getSQLiteDatabaseLocation() picks up the temp path
  const { AppModule } = await import('../../src/modules/app/app.module')

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = moduleRef.createNestApplication()

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  app.setGlobalPrefix('api')
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })

  await app.init()

  return { app, moduleRef, tmpDir }
}

export async function destroyTestApp(testApp: TestApp): Promise<void> {
  await testApp.app.close()
  fs.rmSync(testApp.tmpDir, { recursive: true, force: true })
}
