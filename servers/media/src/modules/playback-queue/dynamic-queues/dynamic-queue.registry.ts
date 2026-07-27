import { Provider } from '@nestjs/common'

import { DynamicQueueType } from '../dtos/CreatePlaybackQueue'

import { DynamicQueue } from './types'
import { TrueShuffleQueue } from './true-shuffle-queue.service'
import { HouseMixQueue } from './house-mix-queue.service'
import { EncoreQueue } from './encore-queue.service'
import { UndertowQueue } from './undertow-queue.service'

/*
  Every dynamic queue type the server knows about. Adding one is a new
  `<name>-queue.service.ts` beside these plus a line here; nothing else in the
  module needs to know it exists.
*/
export const DYNAMIC_QUEUE_SERVICES = [
  TrueShuffleQueue,
  HouseMixQueue,
  EncoreQueue,
  UndertowQueue,
]

/**
 * Resolves a queue's `dynamicType` to the service that generates its items.
 */
export class DynamicQueueRegistry {
  private readonly queuesByType = new Map<DynamicQueueType, DynamicQueue>()

  constructor(queues: DynamicQueue[]) {
    for (const queue of queues) {
      this.queuesByType.set(queue.dynamicType, queue)
    }
  }

  /**
   * The service behind a dynamic type, or undefined when the type is unknown to
   * this server. A queue row can outlive the type that created it.
   */
  get(dynamicType: DynamicQueueType): DynamicQueue | undefined {
    return this.queuesByType.get(dynamicType)
  }

  /**
   * Whether a type refuses to be created without a seed release or artist.
   */
  requiresSeed(dynamicType: DynamicQueueType): boolean {
    return !!this.queuesByType.get(dynamicType)?.requiresSeed
  }
}

// The registry is assembled from whichever queue services are registered above
export const dynamicQueueRegistryProvider: Provider = {
  provide: DynamicQueueRegistry,
  useFactory: (...queues: DynamicQueue[]) => new DynamicQueueRegistry(queues),
  inject: DYNAMIC_QUEUE_SERVICES,
}
