import type { PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import { useAppDispatch } from '../../../hooks/useAppDispatch'
import Icon from '../../typography/Icon'
import MusicAnimation from '../../layout/MusicAnimation'
import Loading from '../../layout/Loading'

import { settingsSelectors } from '../../../store/slices/settings'
import { audioSelectors, audioActions, Player } from '../../../store/slices/music'
import play from '../../../store/slices/music/thunks/play'

import i18n from './i18n'

import './MusicPlaybackButton.css'

export type PlayButtonSizeType = 'm' | 's'

type MusicPlaybackButtonProps = {
  musicTrackIds: string[],
  musicTrackTitle?: string,
  musicTrackIdToPlay: string,
  solid?: boolean,
  size?: PlayButtonSizeType,
}

/**
 * Allows the user to start playing a track and to pause it.
 * 
 * @param [musicTrackIds] - One or more music track IDs that count as tracks for
 * this button. When these IDs are playing, this button will show the pause
 * button. When the user clicks the pause button, all of these track IDs will be
 * paused if multiple are playing.
 * @param [musicTrackIdToPlay] - The track ID that will be played by default
 * when clicked.
 */
const MusicPlaybackButton = ({
  musicTrackTitle,
  musicTrackIds,
  musicTrackIdToPlay,
  solid,
  size = 's',
}: PropsWithChildren<MusicPlaybackButtonProps>) => {
  const dispatch = useAppDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const playing = useSelector(audioSelectors.playing)
  const loading = useSelector(audioSelectors.loading)
  const paused = useSelector(audioSelectors.paused)
  const isPlaying = playing.some((player: Player) => musicTrackIds.includes(player.trackId))
  const isLoading = loading.find((player: Player) => musicTrackIds.includes(player.trackId))
  const isPaused = paused.find((player: Player) => musicTrackIds.includes(player.trackId))

  const handlePlayClick = () => {
    dispatch(play({ trackIds: [musicTrackIdToPlay] }))
  }

  const handlePauseClick = () => {
    playing.forEach((player: Player) => {
      if (musicTrackIds.includes(player.trackId)) {
        dispatch(audioActions.pause(player.id))
      }
    })
  }

  const handleToggleClick = () => {
    if (isPlaying) {
      handlePauseClick()
    } else {
      handlePlayClick()
    }
  }

  return (
    <div
      className={clsx('music-playback-button', !!solid && 'solid', !!size && `size-${size}`)}
    >
      {(isLoading) &&
        <Loading size="s" />
      }
      {(isPlaying || isPaused) && !isLoading &&
        <MusicAnimation onClick={handleToggleClick} isAnimating={isPlaying} />
      }
      {(!isPlaying && !isPaused) && !isLoading &&
        <Icon
          fa="fas fa-play"
          className="music-playback-button play"
          title={musicTrackTitle ? i18n['music-playback-button.title.play'][lang] : undefined}
          hoverType="icon"
          onClick={handlePlayClick}
        />
      }
    </div>
  )
}

export default MusicPlaybackButton
