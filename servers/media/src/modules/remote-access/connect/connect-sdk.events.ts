import { EventEmitter } from 'node:events'
import { Injectable } from '@nestjs/common'
import type {
  CertUpdatePayload,
  ConfigUpdatePayload,
  RegisteredPayload,
  RelayAbort,
  RelayHttpRequest,
  RelayHttpRequestEnd,
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
  'relay:http:request:end': RelayHttpRequestEnd,
  'relay:abort': RelayAbort,
  'connection:state': ConnectionState,
  'binary:frame': BinaryFramePayload,
  // Fires only on persisted enable/disable, never on transient disconnects
  'enabled:changed': boolean,
  // Fire when the owner turns one connection path on or off on its own
  'direct:changed': boolean,
  'relay:changed': boolean,
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
