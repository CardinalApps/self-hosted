import { Reorder, useDragControls } from 'framer-motion'
import { useSelector } from 'react-redux'
import type { PointerEvent } from 'react'

import MusicTrack from '../../interaction/MusicTrack'

import { QueueItem } from '../../../store/slices/music'
import { settingsSelectors } from '../../../store/slices/settings'
import { useGetMusicTrackQuery } from '../../../store/apis/musicTracks'

import i18n from './i18n'

type QueueTrackProps = {
  item: QueueItem,
  lang: string,
  // Whether this row sits near the viewport. Off-screen rows stay mounted (Reorder needs
  // them) but skip the track lookup and render an empty box of the same height.
  active: boolean,
  onDragStart: () => void,
  onDragEnd: (item: QueueItem) => void,
}

/**
 * One draggable row in the playback queue.
 *
 * A MusicTrack row is interactive in its own right (play button, ratings, double
 * click to play), so a pointerdown only starts a drag when it doesn't land on one
 * of those controls — everywhere else on the row is fair game to grab.
 */
const QueueTrack = ({ item, lang, active, onDragStart, onDragEnd }: QueueTrackProps) => {
  const dragControls = useDragControls()
  const { enable_glass } = useSelector(settingsSelectors.current)
  const { data: musicTrack } = useGetMusicTrackQuery({ id: item.mediaId }, { skip: !active })

  const handlePointerDown = (event: PointerEvent) => {
    const target = event.target as HTMLElement
    if (target.closest('button, a, input, .music-playback-button')) {
      return
    }
    dragControls.start(event)
  }

  return (
    <Reorder.Item
      className="queue-item"
      value={item}
      aria-label={i18n['playback-sidebar.queue-reorder'][lang]}
      dragListener={false}
      dragControls={dragControls}
      onPointerDown={handlePointerDown}
      onDragStart={onDragStart}
      onDragEnd={() => onDragEnd(item)}
    >
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
              glass={enable_glass as boolean}
            />
          )
          : <div className="queue-item-placeholder" />
        }
      </div>
    </Reorder.Item>
  )
}

export default QueueTrack
