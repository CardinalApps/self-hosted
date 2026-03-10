import { MessageEvent } from '@nestjs/common'
import { Subject } from 'rxjs'

export type EventPayloadType = string | Record<string, unknown>

export type EventType = {
  type: string,
  payload?: EventPayloadType,
  user?: number,
}

export type ConnectedSSEClient = {
  clientId: string,
  subject: Subject<MessageEvent>,
  close: () => void,
}
