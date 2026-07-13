import { useState } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import Icon from '../../typography/Icon'

import { settingsSelectors } from '../../../store/slices/settings'
import { audioSelectors } from '../../../store/slices/music'
import { useVisiblePlayer } from '../../../hooks/useVisiblePlayer'
import AnimatedGradient from '../../layout/AnimatedGradient'

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
const MiniAudioPlayer = () => {
  const { lang, enable_glass } = useSelector(settingsSelectors.current)
  const players = useSelector(audioSelectors.players)
  const [visiblePlayer, setVisiblePlayer] = useVisiblePlayer()
  const [glassColors, setGlassColors] = useState<string[]>([])

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

  return (
    <div className={clsx('mini-audio-player', enable_glass && 'glass-enabled')}>
      <div className="audio-players">
        {!!(Object.keys(players).length > 1) && !!visiblePlayer &&
          <div className="mini-audio-player-controls">
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
          </div>
        }
        <div className="audio-player-list">
          {visiblePlayer && players?.[visiblePlayer] && (
            <AudioPlayer
              className={clsx('top', enable_glass && 'glass')}
              key={visiblePlayer}
              playerId={visiblePlayer}
              size="mini"
              onColorsLoaded={(colors) => setGlassColors(colors)}
            />
          )}
          {!!enable_glass && <AnimatedGradient values={glassColors} />}
        </div>
      </div>
    </div>
  )
}

export default MiniAudioPlayer
