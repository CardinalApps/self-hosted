import { Reorder, useDragControls } from 'framer-motion'
import type { PointerEvent } from 'react'

import MusicTrack from '../../interaction/MusicTrack'

import { QueueItem } from '../../../store/slices/music'
import { useGetMusicTrackQuery } from '../../../store/apis/musicTracks'

import i18n from './i18n'

type QueueTrackProps = {
  item: QueueItem,
  lang: string,
  onDragEnd: (item: QueueItem) => void,
}

/**
 * One draggable row in the playback queue.
 *
 * A MusicTrack row is interactive in its own right (play button, ratings, double
 * click to play), so dragging is driven from a dedicated handle rather than from
 * the row itself.
 */
const QueueTrack = ({ item, lang, onDragEnd }: QueueTrackProps) => {
  const dragControls = useDragControls()
  const { data: musicTrack } = useGetMusicTrackQuery({ id: item.mediaId })

  return (
    <Reorder.Item
      className="queue-item"
      value={item}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={() => onDragEnd(item)}
    >
      <button
        type="button"
        className="queue-item-handle"
        title={i18n['playback-sidebar.queue-reorder'][lang]}
        onPointerDown={(event: PointerEvent) => dragControls.start(event)}
      >
        <i className="fa-icon fas fa-grip-lines" />
      </button>
      <div className="queue-item-track">
        <MusicTrack
          musicTrackId={item.mediaId}
          trackTitle={musicTrack?.title}
          releaseTitle={musicTrack?.release?.title}
          releaseId={musicTrack?.release?.id}
          artistName={musicTrack?.artists?.map((artist) => artist.name)?.join(', ')}
          canRate={false}
        />
      </div>
    </Reorder.Item>
  )
}

export default QueueTrack
