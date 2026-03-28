import { join } from 'path'

import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
//import { APP_INTERCEPTOR } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { ServeStaticModule } from '@nestjs/serve-static'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

import { AppController } from './app.controller'
import { AppService } from './app.service'

import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../database/database.module'
import { EventModule } from '../event/event.module'
import { SettingsModule } from '../settings/settings.module'
import { UserModule } from '../user/user.module'
import { IndexingModule } from '../indexing/indexing.module'
import { MusicArtistModule } from '../music-artist/music-artist.module'
import { MusicReleaseModule } from '../music-release/music-release.module'
import { MusicTrackModule } from '../music-track/music-track.module'
import { MusicGenreModule } from '../music-genres/music-genre.module'
import { PhotoModule } from '../photo/photo.module'
import { PhotoAlbumModule } from '../photo-album/photo-album.module'
import { ThumbnailModule } from '../thumbnail/thumbnail.module'
import { JobModule } from '../job/job.module'
import { RBACModule } from '../rbac/rbac.module'
import { LibraryModule } from '../library/library.module'
import { MusicHistoryModule } from '../music-history/music-history.module'
import { InvitationModule } from '../invitation/invitation.module'
import { ClaimModule } from '../claim/claim.module'
import { PlaybackQueueModule } from '../playback-queue/playback-queue.module'
import { TranscodingModule } from '../transcoding/transcoding.module'

import { HTTPLoggerMiddleware } from '../../middleware/HTTPLogger.middleware'
import { RevokeDisabledUserSessions } from '../../middleware/RevokeDisabledUserSessions.middleware'
import { AttachOriginApp } from '../../middleware/AttachOriginApp.middleware'
import { AttachLocalUserToRequest } from '../../middleware/AttachLocalUser.middleware'
import { AttachCloudUserToRequest } from '../../middleware/AttachCloudUser.middleware'
import { UserActivity } from '../../middleware/UserActivity.middleware'
import { MaybeTriggerClaim } from '../../middleware/MaybeTriggerClaim'

//import { ExampleInterceptor } from '../../interceptors/example.interceptor'

import { ReleaseChannels } from '../../utils/releaseChannels'
//import { LogLevel } from '../../utils/logging'

import {
  Mode,
  envVar,
  getCurrentMode,
  isContainerEnv,
  getSQLiteDatabaseLocation,
} from '../../utils/env'

const resolveDatabaseLogLevel = () => {
  const level = envVar('DATABASE_LOG_LEVEL', 0) as number
  if (level > 0 && level <= 10) return ['query', 'error']
  if (level > 0 && level <= 20) return ['error']
  return false
}

const resolvePostgresHost = () => {
  const setByUser = envVar('POSTGRES_HOST', false)

  if (setByUser) {
    return setByUser
  }
  if (!isContainerEnv()) {
    return '127.0.0.1'
  }
  if (getCurrentMode() === Mode.DEVELOPMENT) {
    // matches docker compose service name
    return 'cardinal-media-server-pg-dev'
  }

  const releaseChannel = envVar('RELEASE_CHANNEL', false)

  if (!releaseChannel) {
    return Logger.error('Cannot find PostgresSQL database server because RELEASE_CHANNEL is missing.', 'Database')
  }
  if (releaseChannel === ReleaseChannels.BETA) {
    // matches docker compose service name
    return 'cardinal-media-server-beta-postgres-db'
  }
  // matches docker compose service name
  return 'cardinal-media-server-stable-postgres-db'
}

@Module({
  imports: [
    // @ts-expect-error FIXME didn't feel like typing this when converting from vanilla JS
    TypeOrmModule.forRoot(envVar('CARDINAL_POSTGRES', false)
      ? {
          type: 'postgres',
          host: resolvePostgresHost(),
          port: envVar('POSTGRES_PORT', 5432),
          username: envVar('POSTGRES_USER', 'cardinal'),
          password: envVar('POSTGRES_PASSWORD', 'cardinal'),
          ...(envVar('POSTGRES_DATABASE', false) ? { database: envVar('POSTGRES_DATABASE', undefined) } : {}),
          ssl: envVar('POSTGRES_SSL', false),
          autoLoadEntities: true,
          retryAttempts: 3,
          logging: resolveDatabaseLogLevel(),
          namingStrategy: new SnakeNamingStrategy(),
          // this stays on until v1.0.0
          synchronize: true,
        }
      // SQLite
      : {
          type: 'better-sqlite3',
          database: getSQLiteDatabaseLocation(),
          autoLoadEntities: true,
          retryAttempts: 3,
          logging: resolveDatabaseLogLevel(),
          namingStrategy: new SnakeNamingStrategy(),
          // this stays on until v1.0.0
          synchronize: true,
        },
    ),
    ScheduleModule.forRoot(),
    // Initialize modules
    AuthModule,
    DatabaseModule,
    EventModule,
    SettingsModule,
    UserModule,
    IndexingModule,
    MusicArtistModule,
    MusicReleaseModule,
    MusicTrackModule,
    MusicGenreModule,
    PhotoModule,
    PhotoAlbumModule,
    ThumbnailModule,
    JobModule,
    RBACModule,
    LibraryModule,
    MusicHistoryModule,
    InvitationModule,
    PlaybackQueueModule,
    ClaimModule,
    TranscodingModule,
    // Serve static SPAs, for static files like images use "useStaticAssets" in main.js
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'public'),
      serveRoot: '/',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'public', 'admin'),
      serveRoot: '/admin',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'public', 'photos'),
      serveRoot: '/photos',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'public', 'music'),
      serveRoot: '/music',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'public', 'cinema'),
      serveRoot: '/cinema',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Interceptors
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: ExampleInterceptor,
    // }
  ],
})
export class AppModule implements NestModule {
  // Order matters here
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HTTPLoggerMiddleware).forRoutes('*')
    consumer.apply(AttachOriginApp).forRoutes('*')
    consumer.apply(AttachLocalUserToRequest).forRoutes('*')
    consumer.apply(AttachCloudUserToRequest).forRoutes('*')
    consumer.apply(RevokeDisabledUserSessions).forRoutes('*')
    consumer.apply(UserActivity).forRoutes('*')
    consumer.apply(MaybeTriggerClaim).forRoutes('*')
  }
}
