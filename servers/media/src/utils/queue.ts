import * as Queue from 'better-queue'
import { QueueStats } from 'better-queue'

export type QueueProgress = {
  completed: number
  total: number
  taskMs?: number
  jobMs?: number
  estimatedJobMsRemaining?: number
}

/**
 * The shape of all Nest services that are queues.
 */
export interface QueueService {
  readonly queue: Queue

  tick: (data, cb: (error, result) => void) => Promise<void>
  onTickSuccess: (taskId, data, stats) => Promise<void>
  onTickFailed: (taskId, data, stats: QueueStats) => Promise<void>
  onQueueDone: () => Promise<void>

  start: (data) => void
  pause?: (id) => Promise<void>
  resume?: (id) => Promise<void>
  cancel?: (id) => Promise<void>
  getProgress?: (stats: QueueStats) => Promise<QueueProgress>
}
