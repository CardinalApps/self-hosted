import * as fs from 'fs'
import * as path from 'path'
import * as cookieParser from 'cookie-parser'
import { NestFactory } from '@nestjs/core'
import { SwaggerModule } from '@nestjs/swagger'
import { Logger, VersioningType, ValidationPipe } from '@nestjs/common'
import { WsAdapter } from '@nestjs/platform-ws'
import { NestExpressApplication } from '@nestjs/platform-express'

import * as ip from 'ip'

import { AppModule } from './modules/app/app.module'

import {
  Env,
  envVar,
  getAppDir,
  touchAppDir,
  getCurrentEnv,
  getCurrentMode,
  getMountedMediaTypesInContainer,
  isContainerEnv,
} from './utils/env'
import { setupOpenApiDoc } from './utils/openApi'

const PORT = envVar('CARDINAL_HOME_SERVER_PORT', 3080) as number

/**
 * Starts up Cardinal Media Server.
 */
async function startup() {
  /**
   * Prevents TypeORM from doing the same conversion that PostgreSQL already
   * does on date columns.
   */
  process.env.TZ = 'UTC'

  /**
   * Get app version.
   */
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
    Logger.log(`Starting Cardinal Media Server v${pkg?.version}`, 'Welcome')
  } catch (error) {
    Logger.log(`Starting Cardinal Media Server (unknown version)`, 'Welcome')
  }

  /**
   * Startup logs.
   */
  Logger.log(`All dates and times are UTC.`, 'Environment')
  Logger.log(`Mode: ${getCurrentMode()}`, 'Environment')
  Logger.log(`Environment: ${getCurrentEnv()}`, 'Environment')
  Logger.log(`Release channel: ${envVar('RELEASE_CHANNEL', undefined)}`, 'Environment')
  Logger.log(`Node.js version: ${process.versions.node}`, 'Environment')

  /**
   * Ensure that all of our application directories are correct.
   */
  try {
    touchAppDir()
    Logger.log(`Using application directory: ${getAppDir()}`, 'Environment')
  } catch (e) {
    throw new Error(`Application directory is not writable: ${getAppDir()}`)
  }

  /**
   * If in container, check which media directories have been mounted.
   */
  if (getCurrentEnv() === Env.CONTAINER) {
    const mounted = await getMountedMediaTypesInContainer()
    if (mounted.length) {
      Logger.log(`Found mounted media directories for: ${mounted.toString()}`, 'Environment')
    } else {
      Logger.warn('There are no mounted media directories. When running Cardinal in a container, media directories must be mounted when creating the container.')
    }
  }

  /**
   * Create Nest.js app instance.
   */
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.use(cookieParser())

  /**
   * Register global pipes.
   */
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }))

  /**
   * Enable WebSockets with ws.js.
   */
  app.useWebSocketAdapter(new WsAdapter(app))

  /**
   * Set CORS rules.
   */
  app.enableCors({
    origin: [
      'http://localhost:3090',      // Media Server web app
      'http://localhost:3092',      // Photos web app dev
      'http://localhost:3094',      // Music web app dev
      'http://localhost:3096',      // Cinema web app dev
      'http://127.0.0.1:3090',      // Media Server web app
      'http://192.168.2.97:3090',   // Media Server web app
      'http://localhost:3099',      // Component Library development
      'http://localhost:3000',      // Local prod web app tests
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    exposedHeaders: [
      'Cardinal-Extra-Message',
    ],
    credentials: true,
  })

  /**
   * Prefix all endpoints (except public static dirs) with /api/{version}.
   */
  app.setGlobalPrefix('api')
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  })

  /**
   * Set up hosted OpenAPI page.
   */
  const openAPIDoc = setupOpenApiDoc()
  const openAPIDocument = SwaggerModule.createDocument(app, openAPIDoc)
  SwaggerModule.setup('/api/docs', app, openAPIDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })

  if (getCurrentMode() === 'development') {
    Logger.log('Writing openapi.json', 'Development')
    fs.writeFileSync('./openapi.json', JSON.stringify(openAPIDocument))
  }

  /**
   * Start listening on the network.
   */
  await app.listen(PORT)

  /**
   * Welcome message box.
   */
  const printWelcome = (ip) => {
    Logger.log('╭────────────────────────────────────────────────────────────────╮', 'Welcome')
    Logger.log('│ Cardinal Media Server started!                                 │', 'Welcome')
    Logger.log('│                                                                │', 'Welcome')
    Logger.log(`│ Admin...........................${(ip+':'+PORT+'/admin').padEnd(31)}│`, 'Welcome')
    Logger.log(`│ Music...........................${(ip+':'+PORT+'/music').padEnd(31)}│`, 'Welcome')
    Logger.log(`│ Photos..........................${(ip+':'+PORT+'/photos').padEnd(31)}│`, 'Welcome')
    Logger.log(`│ Cinema..........................${(ip+':'+PORT+'/cinema').padEnd(31)}│`, 'Welcome')
    Logger.log(`│ API specification...............${(ip+':'+PORT+'/api/docs').padEnd(31)}│`, 'Welcome')
    Logger.log('│ Manage your Cardinal account....account.cardinalapps.io        │', 'Welcome')
    Logger.log('│ Get help using your apps........help.cardinalapps.io           │', 'Welcome')
    Logger.log('│ Community Forums................cardinal.discourse.group       │', 'Welcome')
    Logger.log('╰────────────────────────────────────────────────────────────────╯', 'Welcome')
  }

  if (isContainerEnv()) {
    printWelcome(!!globalThis?.host?.docker?.internal || '<computer-ip>')
  } else {
    printWelcome(ip.address())
  }
}

try {
  startup()
} catch(error) {
  Logger.error('Uncaught error at app boundary', 'App')
  console.log(error)
}
