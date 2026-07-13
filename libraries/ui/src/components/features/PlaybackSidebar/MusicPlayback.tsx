import { useSelector } from 'react-redux'
import clsx from 'clsx'

import AudioPlayer from '../AudioPlayer/AudioPlayer'
import PlaybackQueue from './PlaybackQueue'

import { audioSelectors } from '../../../store/slices/music'
import { settingsSelectors } from '../../../store/slices/settings'
import { useVisiblePlayer } from '../../../hooks/useVisiblePlayer'

import { usePlaybackSidebar } from './context'

import i18n from './i18n'

/**
 * The Music app's playback sidebar contents: a full sized player, and the queue
 * that feeds it.
 */
const MusicPlayback = () => {
  const { lang, enable_glass } = useSelector(settingsSelectors.current)
  const players = useSelector(audioSelectors.players)
  const [visiblePlayer] = useVisiblePlayer()
  const { setGlassColors } = usePlaybackSidebar()
  const player = visiblePlayer ? players?.[visiblePlayer] : undefined

  if (!player) {
    return (
      <div className="playback-sidebar-empty">
        <p>{i18n['playback-sidebar.nothing-playing'][lang]}</p>
      </div>
    )
  }

  return (
    <>
      <AudioPlayer
        className={clsx('playback-sidebar-player', enable_glass && 'glass')}
        key={visiblePlayer}
        playerId={visiblePlayer}
        size="wide"
        onColorsLoaded={setGlassColors}
      />
      <PlaybackQueue
        queueId={player.queue?.queueId}
        currentQueueItemId={player.currentQueueItem?.queueItemId}
      />
    </>
  )
}

export default MusicPlayback
