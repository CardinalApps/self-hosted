import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Reorder } from 'framer-motion'
import clsx from 'clsx'

import QueueTrack from './QueueTrack'

import { QueueItem } from '../../../store/slices/music'
import { settingsSelectors } from '../../../store/slices/settings'
import { useGetQueueItemsQuery, useMoveQueueItemMutation } from '../../../store/apis/playbackQueues'

import i18n from './i18n'

import './PlaybackQueue.css'

// How far ahead of the current track to show. Queues run to 200+ items, and nobody
// scrolls that far into the future.
const QUEUE_LOOKAHEAD = 50

type PlaybackQueueProps = {
  className?: string,
  queueId: string,
  currentQueueItemId: string,
}

/**
 * The playback queue, as the user thinks of it: everything that comes after the
 * track showing in the player. The current track is deliberately left out, because
 * the player above is already showing it.
 *
 * The list re-keys on the current queue item, so when playback moves on, the query
 * refetches from the new position and the queue shifts up by one on its own.
 */
const PlaybackQueue = ({
  className,
  queueId,
  currentQueueItemId,
}: PlaybackQueueProps) => {
  const { lang } = useSelector(settingsSelectors.current)
  const [moveQueueItem] = useMoveQueueItemMutation()

  const { data: queueItemsData } = useGetQueueItemsQuery({
    queueId,
    leading: QUEUE_LOOKAHEAD,
    currentQueueItemId,
    includeCurrentItemInReturn: false,
  }, {
    skip: !queueId || !currentQueueItemId,
  })
  // Read straight off the cached tuple; a fallback literal here would be a fresh
  // array on every render, and the effect below would loop forever
  const serverItems = queueItemsData?.[0]

  // Dragging reorders this local copy right away, so the row follows the cursor
  // instead of waiting for the server to agree
  const [items, setItems] = useState<QueueItem[]>([])

  useEffect(() => {
    setItems(serverItems ?? [])
  }, [serverItems])

  /**
   * Persist a drag by naming the row the item was dropped behind, and let the server
   * work out the position. The first row's predecessor is the track that is playing,
   * which is what keeps a dragged item from landing behind the playhead.
   */
  const handleDragEnd = (item: QueueItem) => {
    const predecessorOf = (list: QueueItem[]) => {
      const index = list.findIndex((candidate) => candidate.queueItemId === item.queueItemId)
      if (index === -1) {
        return undefined
      }
      return index === 0 ? currentQueueItemId : list[index - 1].queueItemId
    }

    const afterQueueItemId = predecessorOf(items)

    // A drag that ended where it started is not a move
    if (!afterQueueItemId || afterQueueItemId === predecessorOf(serverItems ?? [])) {
      return
    }

    moveQueueItem({ queueId, queueItemId: item.queueItemId, afterQueueItemId })
  }

  if (!items.length) {
    return (
      <div className={clsx(className, 'playback-queue', 'is-empty')}>
        <h3 className="playback-queue-title">{i18n['playback-sidebar.queue-title'][lang]}</h3>
        <p className="playback-queue-empty">{i18n['playback-sidebar.queue-empty'][lang]}</p>
      </div>
    )
  }

  return (
    <div className={clsx(className, 'playback-queue')}>
      <h3 className="playback-queue-title">{i18n['playback-sidebar.queue-title'][lang]}</h3>
      <Reorder.Group
        as="ol"
        axis="y"
        className="queue-list"
        values={items}
        onReorder={setItems}
      >
        {items.map((item) => (
          <QueueTrack
            key={item.queueItemId}
            item={item}
            lang={lang as string}
            onDragEnd={handleDragEnd}
          />
        ))}
      </Reorder.Group>
    </div>
  )
}

export default PlaybackQueue
