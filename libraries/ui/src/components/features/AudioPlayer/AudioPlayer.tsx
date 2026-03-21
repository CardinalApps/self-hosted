import { useRef, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import clsx from 'clsx'
import { useAppSelector } from '../../../hooks/useAppSelector'
import { useAppDispatch } from '../../../hooks/useAppDispatch'

import Icon from '../../typography/Icon'
import Loading from '../../layout/Loading'
import Scrubber from '../../interaction/Scrubber'

import { audioSelectors, audioActions } from '../../../store/slices/music'
import { CACHED_SEEK_SESSION_STORAGE_KEY, PLAYBACK_STATE } from '../../../store/slices/music/constants'
import play from '../../../store/slices/music/thunks/play'
import next from '../../../store/slices/music/thunks/next'
import previous from '../../../store/slices/music/thunks/previous'

import { getHowl } from '../../../hooks/useHowler'
import { useReleaseCover } from '../../../hooks/useReleaseCover'

import { useGetMusicTrackQuery } from '../../../store/apis/musicTracks'

import { secondsToMMSS } from '../../../lib/formatting/time'

import './AudioPlayer.css'

export type CachedSeekPositionType = {
  [playerId: string]: number,
}

type AudioPlayerProps = {
  className?: string,
  playerId: string,
  size: 'mini' | 'wide',
}

/**
 * One AudioPlayer controls the playback of one audio stream.
 */
const AudioPlayer = ({
  className,
  playerId,
  size,
}: PropsWithChildren<AudioPlayerProps>) => {
  const howl = getHowl(playerId)
  const dispatch = useAppDispatch()
  //const { max_concurrent_audio_streams } = useSelector(settingsSelectors.current)
  const playbackTimeInterval = useRef(null)
  const players = useAppSelector(audioSelectors.players)
  const player = players?.[playerId]
  const isPlaying = player.state === PLAYBACK_STATE.PLAYING
  const isPaused = player.state === PLAYBACK_STATE.PAUSED
  const musicBlobLoading = player.state === PLAYBACK_STATE.LOADING
  const [playbackSeconds, setPlaybackSeconds] = useState(0)
  const {
    data: musicTrackResponse,
    isLoading: musicTrackLoading,
  } = useGetMusicTrackQuery({ id: player.trackId })
  const track = musicTrackResponse
  const coverSrc = useReleaseCover(track?.release?.id)
  const [fadeIn, setFadeIn] = useState(false)

  const handlePlayClick = (id) => {
    dispatch(play({ trackIds: [id] }))
  }

  const handlePauseClick = () => {
    dispatch(audioActions.pause(player.id))
  }

  const handlePrevClick = () => {
    dispatch(previous({ playerId: player.id }))
  }

  const handleNextClick = () => {
    dispatch(next({ playerId: player.id }))
  }

  const handleStopClick = () => {
    dispatch(audioActions.stop(player.id))
  }

  const getCachedSeekPositions = () => {
    try {
      return JSON.parse(sessionStorage.getItem(CACHED_SEEK_SESSION_STORAGE_KEY))
    } catch (error) {
      console.error(error)
    }
  }

  const cacheSeekPosition = (playerId, seek) => {
    const cached = getCachedSeekPositions()
    sessionStorage.setItem(CACHED_SEEK_SESSION_STORAGE_KEY, JSON.stringify({
      ...cached,
      [playerId]: seek,
    }))
  }

  /**
   * Regularly update the current playback time.
   */
  useEffect(() => {
    if (howl) {
      if (playbackTimeInterval.current) {
        clearInterval(playbackTimeInterval.current)
      }
      playbackTimeInterval.current = setInterval(() => {
        const seek = howl.seek()
        setPlaybackSeconds(seek)
        cacheSeekPosition(playerId, seek)
      }, 250)
    }

    return () => {
      if (playbackTimeInterval.current) {
        clearInterval(playbackTimeInterval.current)
      }
    }
  }, [playerId, howl, player.trackId])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFadeIn(true)
    }, 100)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className={clsx("audio-player", className, !!fadeIn && 'fade-in')} data-size={size} data-state={player.state} key={playerId}>
      <div className="metadata no-collapse">
        <p
          className="audio-player-track-title"
          title={track?.title}
        >
          {track?.title}
        </p>
        {/* <p
          className="audio-player-track-release"
          title={i18n['audio-player.release.title'][lang].replace('{release}', track?.release?.title)}
        >
          {track?.release?.title}
        </p> */}
        <p
          className="audio-player-track-artists"
          title={track?.artists?.map((artist) => artist.name)?.join(', ')}
        >
          {track?.artists?.map((artist) => {
            return (
              <span key={artist.name}>{artist.name}</span>
            )
          })}
        </p>
      </div>
      <div className="controls">
        <div className={clsx('release-image', !track?.release?.thumbnails && 'no-image')}>
          {coverSrc
            ? <img src={coverSrc} />
            : <Icon fa="fas fa-music" />
          }
        </div>
        <div className="audio-player-buttons">
          <Icon
            fa="fas fa-backward"
            className="audio-player-playback-button prev no-collapse"
            onClick={() => handlePrevClick()}
          />
          {!!(musicTrackLoading || musicBlobLoading) && <Loading size="s" />}
          {!!isPaused && !musicTrackLoading && !musicBlobLoading &&
            <Icon
              fa="fas fa-play"
              className="audio-player-playback-button play"
              onClick={() => handlePlayClick(track?.musicTrackId)}
            />
          }
          {!!isPlaying && !musicTrackLoading && !musicBlobLoading &&
            <Icon
              fa="fas fa-pause"
              className="audio-player-playback-button pause"
              onClick={() => handlePauseClick()}
            />
          }
          <Icon
            fa="fas fa-forward"
            className="audio-player-playback-button next no-collapse"
            onClick={() => handleNextClick()}
          />
          <Icon
            fa="fas fa-stop"
            className="audio-player-playback-button stop no-collapse"
            onClick={() => handleStopClick()}
          />
        </div>
      </div>
      <div className="scrubber-row">
        <Scrubber
          className="no-collapse"
          value={playbackSeconds}
          min={0}
          max={howl?.duration?.() || 0}
          onChangeEnd={({ value }) => {
            howl.seek(value)
          }}
        />
        <div className="scrubber-time">
          <time className="current-time">{secondsToMMSS(playbackSeconds)}</time> <span className="no-collapse">/</span>
          <time className="total-time no-collapse">{secondsToMMSS(howl?.duration?.() || 0)}</time>
        </div>
      </div>
    </div>
  )
}

export default AudioPlayer
