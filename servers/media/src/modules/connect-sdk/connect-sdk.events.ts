import { EventEmitter } from 'node:events'
import { Injectable } from '@nestjs/common'
import type {
  CertUpdatePayload,
  ConfigUpdatePayload,
  RegisteredPayload,
  RelayAbort,
  RelayHttpRequest,
} from '@cardinalapps/remote-access/dist/cjs'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'auth_failed'

export type BinaryFramePayload = {
  requestId: string,
  chunk: Uint8Array,
}

export type ConnectSDKEventPayloads = {
  'registered': RegisteredPayload,
  'config:update': ConfigUpdatePayload,
  'cert:update': CertUpdatePayload,
  'relay:http:request': RelayHttpRequest,
  'relay:abort': RelayAbort,
  'connection:state': ConnectionState,
  'binary:frame': BinaryFramePayload,
}

/**
 * The typed event bus that other modules subscribe to for Remote Access
 * events (cert hot-reload, relay dispatch, the probe middleware, the UI
 * status endpoint). The ConnectSDKService is the only emitter.
 */
@Injectable()
export class ConnectSDKEvents {
  private readonly emitter = new EventEmitter()

  // Subscribes to an event
  on<K extends keyof ConnectSDKEventPayloads>(event: K, listener: (payload: ConnectSDKEventPayloads[K]) => void): void {
    this.emitter.on(event, listener)
  }

  // Unsubscribes from an event
  off<K extends keyof ConnectSDKEventPayloads>(event: K, listener: (payload: ConnectSDKEventPayloads[K]) => void): void {
    this.emitter.off(event, listener)
  }

  // Emits an event to all subscribers
  emit<K extends keyof ConnectSDKEventPayloads>(event: K, payload: ConnectSDKEventPayloads[K]): void {
    this.emitter.emit(event, payload)
  }
}
