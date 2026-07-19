import { useState } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import { settingsSelectors } from '../../../store/slices/settings'
import { audioSelectors } from '../../../store/slices/music'
import { useVisiblePlayer } from '../../../hooks/useVisiblePlayer'
import AnimatedGradient from '../../layout/AnimatedGradient'

import AudioPlayer from './AudioPlayer'

import './AudioPlayer.css'

// type GlobalAudioPlayerProps = {
//   layout: string,
// }

/**
 * The GlobalAudioPlayer determines which, and how many, AudioPlayer's to render
 * based on the current Redux state.
 */
const MiniAudioPlayer = () => {
  const { enable_glass } = useSelector(settingsSelectors.current)
  const players = useSelector(audioSelectors.players)
  const [visiblePlayer] = useVisiblePlayer()
  const [glassColors, setGlassColors] = useState<string[]>([])

  return (
    <div className={clsx('mini-audio-player', enable_glass && 'glass-enabled')}>
      <div className="audio-players">
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
