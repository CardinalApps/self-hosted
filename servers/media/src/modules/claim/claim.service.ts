import { Injectable, Logger } from '@nestjs/common'

import { EventService } from '../event/event.service'
import { UserService } from '../user/user.service'
import { DatabaseService } from '../database/database.service'
import { OPTIONS } from '../../utils/options'
import { authAPI } from '../../utils/cloud'
import { SettingsService } from '../settings/settings.service'
import { CardinalApp } from '../../utils/apps'
import { CreateOwnerEventPayload, UserEvents } from '../user/events'

type ClaimRes = {
  claimId: string,
  claimedAt: string,
}

// In-memory record of the most recent claim attempt's outcome. Surfaced to
// e2e tests via a dev-only controller so failed claims can self-diagnose
// without scraping the media server's stdout.
export type ClaimAttemptResult = {
  ok: boolean,
  at: number,
  endpoint: string,
  serverName?: string,
  instanceId?: string,
  // On success — the claim row returned by the cloud.
  claimId?: string,
  // On failure — whatever the auth server (or transport) rejected with,
  // normalized to JSON-safe shapes for serialization.
  error?: { kind: 'object' | 'string' | 'unknown', value: unknown },
  // For early-return paths — explains why the handler exited without
  // sending the POST. `entered` is set the moment the handler runs at all,
  // so a missing entry in the diagnostic endpoint means the handler was
  // never invoked.
  skipReason?: 'no-owner' | 'already-claimed' | 'no-jwt' | 'unknown',
  enteredAt?: number,
}

@Injectable()
export class ClaimService {
  // null until the first attempt. Reset on factoryReset is unnecessary —
  // the value is just diagnostic.
  public lastClaimAttempt: ClaimAttemptResult | null = null

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly settingsService: SettingsService,
    private readonly eventService: EventService,
    private readonly userService: UserService,
  ) {
    this.eventService.subscribePrivate(this, UserEvents.CREATE_OWNER, this.claimServerWithCloudIfNotClaimed.bind(this))
  }

  /**
   * Propagate the local claim to Cardinal's cloud. This will allow the user to
   * see the server in their account portal.
   * 
   * This is async so as not to block any local actions if the cloud is
   * unreachable.
   */
  async claimServerWithCloudIfNotClaimed(options?: CreateOwnerEventPayload): Promise<void> {
    const enteredAt = Date.now()
    // Mark entry so the diagnostic endpoint can distinguish "handler never
    // ran" from "handler ran and early-returned". Overwritten on every
    // attempt — last one wins.
    this.lastClaimAttempt = { ok: false, at: enteredAt, endpoint: '/user/claims', enteredAt, skipReason: 'unknown' }

    if (!options?.jwt) {
      this.lastClaimAttempt = { ...this.lastClaimAttempt, skipReason: 'no-jwt' }
      return
    }

    // Server must have an owner
    const owner = await this.userService.getServerOwner()
    if (!owner) {
      this.lastClaimAttempt = { ...this.lastClaimAttempt, skipReason: 'no-owner' }
      return
    }

    // And it must not already be claimed
    const alreadyClaimed = await this.databaseService.getOption(OPTIONS.CLAIM_ID.name)
    if (alreadyClaimed) {
      this.lastClaimAttempt = { ...this.lastClaimAttempt, skipReason: 'already-claimed' }
      return
    }

    const instanceId = await this.databaseService.getOption(OPTIONS.INSTANCE_ID.name)

    // The serverName will be given in the options during First Time Setup
    const serverName = options?.serverName
      ? options.serverName
      : await this.settingsService.get(CardinalApp.ADMIN, 'server_name')

    const endpoint = '/user/claims'
    authAPI<ClaimRes>(endpoint, 'POST', {
      body: {
        // Cardinal Admin app ID
        ssoAppId: '0d55d632-3517-4b1e-920e-448d6b77b8bf',
        appNameSetByUser: serverName as string,
        instanceId: instanceId as string,
        origin: instanceId as string,
      },
      JWT: options.jwt,
    })
      .then((res) => {
        this.lastClaimAttempt = {
          ok: true,
          at: Date.now(),
          endpoint,
          serverName: serverName as string,
          instanceId: instanceId as string,
          claimId: res?.claimId,
        }
        this.saveClaim(res)
      })
      .catch((err) => {
        // fetchAuthAPI rejects with the auth server's response body — usually
        // an object like { message, statusCode } or a plain string. Stringify
        // explicitly so the log shows the actual reason instead of
        // "[object Object]".
        const detail = typeof err === 'string'
          ? err
          : (() => {
              try { return JSON.stringify(err) } catch { return String(err) }
            })()
        const kind: 'object' | 'string' | 'unknown' = typeof err === 'object' && err
          ? 'object'
          : typeof err === 'string'
            ? 'string'
            : 'unknown'
        this.lastClaimAttempt = {
          ok: false,
          at: Date.now(),
          endpoint,
          serverName: serverName as string,
          instanceId: instanceId as string,
          error: { kind, value: err },
        }
        Logger.warn(`Failed to claim ownership of this server with Cardinal Cloud: ${detail}`, 'Claim')
      })
  }

  /**
   * Saves the claim result from the cloud.
   */
  async saveClaim(res: ClaimRes): Promise<void> {
    if (!res.claimId) {
      Logger.error('Cardinal cloud did not return claim ID', 'Claim')
      return
    }

    if (!res.claimedAt) {
      Logger.error('Cardinal cloud did not return claim date', 'Claim')
      return
    }

    try {
      await this.databaseService.saveOption(OPTIONS.CLAIM_ID.name, res.claimId)
      await this.databaseService.saveOption(OPTIONS.CLAIMED_AT.name, res.claimedAt)
      Logger.log('Successfully claimed this Media Server instance with Cardinal cloud; see your claims at account.cardinalapps.io/account/claims', 'Claim')
    } catch (err) {
      Logger.log(err, 'Claim')
    }
  }
}
