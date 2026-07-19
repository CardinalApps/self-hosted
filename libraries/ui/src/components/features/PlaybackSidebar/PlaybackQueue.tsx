import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Reorder } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import clsx from 'clsx'

import QueueTrack from './QueueTrack'

import { QueueItem } from '../../../store/slices/music'
import { settingsSelectors } from '../../../store/slices/settings'
import { useGetQueueItemsQuery, useMoveQueueItemMutation } from '../../../store/apis/playbackQueues'

import i18n from './i18n'

import './PlaybackQueue.css'

// How much of the queue we mount as reorderable rows. A True Shuffle queue runs to
// 200+ items, and the whole forward window arrives in one cheap request, so this is
// generous. The per-row cost (a track lookup, the full row) is windowed below, so
// what this really bounds is the number of empty Reorder shells, not the work.
const QUEUE_WINDOW = 500

// Every row is pinned to this height, which lets the virtualizer below work out which
// rows are near the viewport from the scroll offset alone. It must match the row height
// in PlaybackQueue.css exactly, or the visible range drifts as the user scrolls.
const ROW_HEIGHT = 64

// How many rows to keep loaded on each side of the viewport, so a flick of the scroll
// wheel lands on real rows rather than placeholders.
const ROW_OVERSCAN = 8

// Until the scroll element has been measured, the virtualizer reports no range, so this
// many rows are loaded from the top to fill the first paint.
const INITIAL_ROWS = 16

type PlaybackQueueProps = {
  className?: string,
  playerId: string,
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
  playerId,
  queueId,
  currentQueueItemId,
}: PlaybackQueueProps) => {
  const { lang } = useSelector(settingsSelectors.current)
  const [moveQueueItem] = useMoveQueueItemMutation()

  const { data: queueItemsData } = useGetQueueItemsQuery({
    queueId,
    leading: QUEUE_WINDOW,
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

  // Grabbing a row is a mousedown-and-move over its own text, which the browser also reads
  // as a text selection — so selection is switched off for exactly as long as a drag is live.
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    setItems(serverItems ?? [])
  }, [serverItems])

  /*
    framer-motion's Reorder wants every row mounted so it can measure the layout it drags
    against, which rules out a virtualizer that unmounts rows. So the rows all stay, and
    the virtualizer is used only to read which of them sit near the viewport: the expensive
    part of a row (a track lookup, the full MusicTrack) loads for those, and the rest render
    a same-height placeholder. Because the rows are a fixed height, the range comes straight
    off the scroll offset, so none of the virtualizer's own positioning is needed here.
  */
  const listRef = useRef<HTMLOListElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: ROW_OVERSCAN,
  })
  const visibleRows = virtualizer.getVirtualItems()
  const activeRows = new Set(visibleRows.map((row) => row.index))

  /**
   * Persist a drag by naming the row the item was dropped behind, and let the server
   * work out the position. The first row's predecessor is the track that is playing,
   * which is what keeps a dragged item from landing behind the playhead.
   */
  const handleDragEnd = (item: QueueItem) => {
    setIsDragging(false)

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
        ref={listRef}
        as="ol"
        axis="y"
        className={clsx('queue-list', isDragging && 'is-dragging')}
        values={items}
        onReorder={setItems}
      >
        {items.map((item, index) => (
          <QueueTrack
            key={item.queueItemId}
            item={item}
            playerId={playerId}
            lang={lang as string}
            // Before the first measurement the virtualizer reports nothing, so fill the head
            active={activeRows.size ? activeRows.has(index) : index < INITIAL_ROWS}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </Reorder.Group>
    </div>
  )
}

export default PlaybackQueue
