import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

import { AppModule } from './app.module'

describe('App E2E', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test
      .createTestingModule({
        imports: [AppModule],
      })
      .compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  it(`GET /health`, () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      //.expect([{ state: 'not_setup' }, { state: 'normal' }])
  })

  afterAll(async () => {
    //await app.close()
  })
})
