export enum PlaybackQueueEvents {
  // Internal: a history entry was written for a queue item, i.e. the user is playing it
  ITEM_PLAYED = 'playback_queue.item_played',

  // Sent to the queue owner's clients when the server appends items to a queue
  EXTENDED = 'playback_queue.extended',
}
