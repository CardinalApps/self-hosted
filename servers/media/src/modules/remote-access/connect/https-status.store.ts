import { Injectable } from '@nestjs/common'

export type HttpsStatus = {
  state: 'stopped' | 'running' | 'error',
  port: number | null,
  certExpiresAt: string | null,
  lastError: string | null,
}

const STOPPED: HttpsStatus = {
  state: 'stopped',
  port: null,
  certExpiresAt: null,
  lastError: null,
}

/**
 * Holds the HTTPS listener's state so the Remote Access status endpoint can
 * report it. It lives in the connect module, not the https module, because
 * HttpsModule already imports ConnectSDKModule — reading the listener from the
 * other direction would make the two modules circular.
 */
@Injectable()
export class HttpsStatusStore {
  private status: HttpsStatus = STOPPED

  // Publishes the listener's current state
  set(status: HttpsStatus): void {
    this.status = status
  }

  // Returns the last published state
  get(): HttpsStatus {
    return this.status
  }
}
