import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import AudioPlayer from '../AudioPlayer/AudioPlayer'
import PlaybackQueue from './PlaybackQueue'
import RecentlyPlayed from './RecentlyPlayed'

import { audioSelectors } from '../../../store/slices/music'
import { PLAYBACK_STATE } from '../../../store/slices/music/constants'
import { settingsSelectors } from '../../../store/slices/settings'
import { useVisiblePlayer } from '../../../hooks/useVisiblePlayer'

import { usePlaybackSidebar } from './context'

/**
 * The Music app's playback sidebar contents: a full sized player, and the queue
 * that feeds it.
 */
const MusicPlayback = () => {
  const { enable_glass } = useSelector(settingsSelectors.current)
  const players = useSelector(audioSelectors.players)
  const [visiblePlayer, setVisiblePlayer] = useVisiblePlayer()
  const { setGlassColors } = usePlaybackSidebar()
  const player = visiblePlayer ? players?.[visiblePlayer] : undefined

  /*
    Hand the sidebar back its idle state when playback stops. The player unmounts without
    ever reporting that its artwork is gone, so without this the sidebar keeps painting
    itself with the colors of a track that is no longer playing.
  */
  useEffect(() => {
    if (!player) {
      setGlassColors([])
    }
  }, [player, setGlassColors])

  if (!player) {
    return (
      <div className="playback-sidebar-idle">
        <RecentlyPlayed />
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
        onSwitchPlayer={setVisiblePlayer}
      />
      {Object.keys(players).length > 1 &&
        <div className="player-dots">
          {Object.keys(players).map((id) => (
            <span
              key={id}
              className={clsx(
                'player-dot',
                id === visiblePlayer && 'active',
                players[id].state === PLAYBACK_STATE.PLAYING && 'playing',
              )}
            />
          ))}
        </div>
      }
      <PlaybackQueue
        playerId={player.id}
        queueId={player.queue?.queueId}
        currentQueueItemId={player.currentQueueItem?.queueItemId}
      />
    </>
  )
}

export default MusicPlayback
