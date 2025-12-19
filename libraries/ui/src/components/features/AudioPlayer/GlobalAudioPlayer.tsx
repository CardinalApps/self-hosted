import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import Icon from '../../typography/Icon'

import { settingsSelectors } from '../../../store/slices/settings'
import { audioSelectors, Player } from '../../../store/slices/music'

import AudioPlayer from './AudioPlayer'

import i18n from './i18n'

import './AudioPlayer.css'

// type GlobalAudioPlayerProps = {
//   layout: string,
// }

/**
 * The GlobalAudioPlayer determines which, and how many, AudioPlayer's to render
 * based on the current Redux state.
 */
const GlobalAudioPlayer = () => {
  const { lang } = useSelector(settingsSelectors.current)
  const players = useSelector(audioSelectors.players)
  const playerIds = useSelector(audioSelectors.playerIds)
  const playing = useSelector(audioSelectors.playing)
  const playingIds = useSelector(audioSelectors.playingIds)
  const [visiblePlayer, setVisiblePlayer] = useState<string | undefined>()

  const changePlayer = (change) => {
    const currentIndex = Object.keys(players).indexOf(visiblePlayer)
    let nextId

    if (change === 'next') {
      const nextIndex = currentIndex + 1 >= Object.keys(players).length
        ? 0
        : currentIndex + 1
      nextId = Object.keys(players)[nextIndex]
    } else if (change === 'prev') {
      const prevIndex = currentIndex - 1 < 0
        ? Object.keys(players).length - 1
        : currentIndex - 1
      nextId = Object.keys(players)[prevIndex]
    }

    setVisiblePlayer(nextId)
  }

  /**
   * Switch to the newest player when one is added.
   */
  useEffect(() => {
    const newest = Object.values(players).sort((a, b) => a?.initializedAt >= b?.initializedAt ? -1 : 1)?.[0]
    if (newest) {
      setVisiblePlayer(newest.id)
    } else {
      setVisiblePlayer(undefined)
    }
  }, [playerIds])

  /**
   * Always show the active player. If multiple are active, show the newest one.
   */
  useEffect(() => {
    const inOrderOfNewset = playing.sort((a: Player, b: Player) => a?.currentPlaybackStartedAt >= b?.currentPlaybackStartedAt ? -1 : 1)
    const playerToShow = inOrderOfNewset?.[0] as Player
    if (playerToShow) {
      setVisiblePlayer(playerToShow.id)
    }
  }, [playingIds])

  return (
    <div className={clsx('global-audio-player')}>
      <div className="audio-players">
        {!!(Object.keys(players).length > 1) && !!visiblePlayer &&
          <div className="audio-player-pagination">
            <div className="audio-player-pagination-icons">
              <Icon
                fa="far fa-arrow-alt-circle-left"
                className="prev-player"
                onClick={() => changePlayer('prev')}
              />
              <Icon
                fa="far fa-arrow-alt-circle-right"
                className="next-player"
                onClick={() => changePlayer('next')}
              />
            </div>
            <p className="no-collapse">
              {
                i18n['audio-player.pagination.label'][lang]
                  .replace('{current}', Object.keys(players).indexOf(visiblePlayer) + 1)
                  .replace('{total}', Object.keys(players).length)
              }
            </p>
          </div>
        }
        <div className="audio-player-list">
          {visiblePlayer && players?.[visiblePlayer] && <AudioPlayer className="top" key={visiblePlayer} playerId={visiblePlayer} size="mini" />}
        </div>
      </div>
    </div>
  )
}

export default GlobalAudioPlayer
