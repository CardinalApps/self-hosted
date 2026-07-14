import { Reorder, useDragControls } from 'framer-motion'
import type { PointerEvent } from 'react'

import MusicTrack from '../../interaction/MusicTrack'

import { QueueItem } from '../../../store/slices/music'
import { useGetMusicTrackQuery } from '../../../store/apis/musicTracks'

import i18n from './i18n'

type QueueTrackProps = {
  item: QueueItem,
  lang: string,
  // Whether this row sits near the viewport. Off-screen rows stay mounted (Reorder needs
  // them) but skip the track lookup and render an empty box of the same height.
  active: boolean,
  onDragEnd: (item: QueueItem) => void,
}

/**
 * One draggable row in the playback queue.
 *
 * A MusicTrack row is interactive in its own right (play button, ratings, double
 * click to play), so dragging is driven from a dedicated handle rather than from
 * the row itself.
 */
const QueueTrack = ({ item, lang, active, onDragEnd }: QueueTrackProps) => {
  const dragControls = useDragControls()
  const { data: musicTrack } = useGetMusicTrackQuery({ id: item.mediaId }, { skip: !active })

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
        {active
          ? (
            <MusicTrack
              musicTrackId={item.mediaId}
              trackTitle={musicTrack?.title}
              releaseTitle={musicTrack?.release?.title}
              releaseId={musicTrack?.release?.id}
              artistName={musicTrack?.artists?.map((artist) => artist.name)?.join(', ')}
              canRate={false}
            />
          )
          : <div className="queue-item-placeholder" />
        }
      </div>
    </Reorder.Item>
  )
}

export default QueueTrack
