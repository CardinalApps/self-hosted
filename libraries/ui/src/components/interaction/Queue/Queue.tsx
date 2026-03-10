import { useSelector } from 'react-redux'
import clsx from 'clsx'

import { useGetQueueItemsQuery } from '../../../store/apis/playbackQueues'
import MusicTrackItem from './items/MusicTrackItem'

import './Queue.css'
import { audioSelectors } from '../../../store/slices/music'

export type QueueProps = {
  className?: string,
  queueId?: string,
  take?: number,
  layout: 'list' | 'interactive',
}

const Queue = ({
  className,
  queueId,
  take,
  layout,
}: QueueProps) => {
  const players = useSelector(audioSelectors.players)
  const player = Object.values(players).find((player) => player?.queue?.queueId === queueId)

  const { data: queueItemsData } = useGetQueueItemsQuery({
    queueId,
    leading: take,
    currentQueueItemId: player?.currentQueueItem?.queueItemId,
    includeCurrentItemInReturn: false,
  })
  const [queueItems] = queueItemsData || [[], 0]

  return (
    <div className={clsx(className, 'playback-queue')} data-layout={layout}>
      {!!queueItems.length && (
        <ol className="queue-list">
          {[...queueItems].reverse().map((item, i) => {
            switch (item.mediaType) {
              case 'music_track':
                return (
                  <li className="queue-item" key={i}>
                    <MusicTrackItem position={++i} musicTrackId={item.mediaId} format={layout} />
                  </li>
                )
            }
          })}
        </ol>
      )}
    </div>
  )
}

export default Queue
