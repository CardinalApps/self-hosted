import { Injectable, Logger, MessageEvent } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'

import { EventPayloadType, EventType, ConnectedSSEClient } from './types'

import { log, LogModule, LogLevel } from '../../utils/logging'

/**
 * The EventService manages connected SSE clients and provides private
 * communication channels for the Nest.js modules.
 */
@Injectable()
export class EventService {
  private connectedClients = new Map<string, ConnectedSSEClient[]>()
  private privateEvents = new Subject()

  /**
   * Save a SSE connection in memory.
   */
  saveConnectedSSEClient(userId, clientId, subject: Subject<MessageEvent>, close: () => void): void {
    if (!this.connectedClients.has(userId)) {
      this.connectedClients.set(userId, [])
    }

    const userClients = this.connectedClients.get(userId)

    userClients.push({
      clientId,
      subject,
      close,
    })

    log(LogModule.EVENTS, LogLevel.DEBUG, `SSE client connected [userId=${userId}] [clientId=${clientId}]`)
  }

  /**
   * Remove a SSE connection from memory.
   */
  removeConnectedSSEClient(userId, clientId): void {
    const userClients = this.connectedClients.get(userId)
    if (!userClients) {
      return Logger.error('Invalid userId when removing a connected SSE client.')
    }

    const clientIndex = userClients.findIndex((c) => c.clientId === clientId)
    if (clientIndex === -1) {
      return Logger.error('Invalid clientId when removing a connected SSE client.')
    }

    userClients[clientIndex].subject.complete()
    userClients.splice(clientIndex, 1)

    log(LogModule.EVENTS, LogLevel.DEBUG, `SSE client disconnected [userId=${userId}] [clientId=${clientId}]`)
  }

  /**
   * Returns the observable that all private events flow through.
   */
  getPrivateEventsObservable(): Observable<unknown> {
    return this.privateEvents.asObservable()
  }

  /**
   * Emits an event on the private channel. The private channel is only
   * used internally by the Nest.js modules.
   */
  emitPrivate(type: string, payload?: EventPayloadType, user?: number): void {
    const event: string = JSON.stringify({ type, payload, user } as EventType)
    this.privateEvents.next(event)
  }

  /**
   * Emit an event to all of the client apps that a user is connected with. If
   * the user is not connected, then the event will be lost.
   */
  emitToUser(userId, type: string, payload?: EventPayloadType) {
    const userClients = this.connectedClients.get(userId)
    const message: MessageEvent = { data: { type, payload } }

    if (userClients && userClients?.length) {
      userClients.forEach((client) => {
        client.subject.next(message)
      })
    }
  }

  /**
   * Emits an event to all currently connected clients of all currently
   * connected users.
   */
  emitPublic(type: string, payload?: EventPayloadType): void {
    const message: MessageEvent = { data: { type, payload } }

    this.connectedClients.forEach((userClients) => {
      if (userClients && userClients?.length) {
        userClients.forEach((client) => {
          client.subject.next(message)
        })
      }
    })
  }

  /**
   * Emits an event on all channels, meaning the private one and all connected
   * client apps.
   */
  emitAll(type: string, payload?: EventPayloadType, user?: number): void {
    this.emitPrivate(type, payload, user)
    this.emitPublic(type, payload)
  }

  /**
   * Subscribe to the private event channel.
   *
   * @param {Object} classInstance - Reference to the instance of the class that
   * is subscribing. This is only used to get the subscriber name for the logs
   * during startup.
   */
  subscribePrivate(classInstance, type, subscriber): void {
    this.getPrivateEventsObservable().subscribe((ev: string) => {
      const event: EventType = JSON.parse(ev)
      if (event.type === type) {
        subscriber(event?.payload)
      }
    })

    log(LogModule.EVENTS, LogLevel.DEBUG, `${classInstance.constructor.name} subscribed to event {${type}} on internal channel.`)
  }
}
