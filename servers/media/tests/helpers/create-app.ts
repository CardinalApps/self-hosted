import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

export interface TestApp {
  app: INestApplication
  moduleRef: TestingModule
}

/**
 * Creates an isolated NestJS application for integration testing using an
 * in-memory SQLite database, so tests never touch the development database.
 */
export async function createTestApp(): Promise<TestApp> {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.SQLITE_PATH = ':memory:'
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

  return { app, moduleRef }
}

export async function destroyTestApp(testApp: TestApp): Promise<void> {
  await testApp.app.close()
}
