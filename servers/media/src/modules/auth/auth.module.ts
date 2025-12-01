import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { SettingsModule } from '../settings/settings.module'
import { UserModule } from '../user/user.module'

import { AuthService } from './auth.service'
import { LoginController } from './auth.controller'

import { getSigningSecret } from '../../utils/jwt'
import { TokenService } from './token.service'
import { CardinalSSOStrategy } from './strategies/cardinal-sso.service'
import { LocalAuthStrategy } from './strategies/local.service'

@Module({
  imports: [
    JwtModule.register({
      secret: getSigningSecret(),
    }),
    SettingsModule,
    UserModule,
  ],
  exports: [
    AuthService,
    TokenService,
    LocalAuthStrategy,
    CardinalSSOStrategy,
  ],
  providers: [
    AuthService,
    TokenService,
    LocalAuthStrategy,
    CardinalSSOStrategy,
  ],
  controllers: [LoginController],
})
export class AuthModule {}
