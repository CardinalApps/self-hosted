import { useRef, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import clsx from 'clsx'
import { useAppSelector } from '../../../hooks/useAppSelector'
import { useAppDispatch } from '../../../hooks/useAppDispatch'

import Icon from '../../typography/Icon'
import MarqueeText from '../../typography/MarqueeText'
import Loading from '../../layout/Loading'
import Scrubber from '../../interaction/Scrubber'
import PlaybackControlBar from '../PlaybackSidebar/PlaybackControlBar'

import { audioSelectors, audioActions } from '../../../store/slices/music'
import { CACHED_SEEK_SESSION_STORAGE_KEY, PLAYBACK_STATE } from '../../../store/slices/music/constants'
import play from '../../../store/slices/music/thunks/play'
import next from '../../../store/slices/music/thunks/next'
import previous from '../../../store/slices/music/thunks/previous'

import { getHowl } from '../../../hooks/useHowler'
import { useReleaseCover } from '../../../hooks/useReleaseCover'
import { useCoverColors } from '../../../hooks/useCoverColors'
import { getContrastTextColor } from '../../../lib/color/getContrastTextColor'
import { settingsSelectors } from '../../../store/slices/settings'

import { useGetMusicTrackQuery } from '../../../store/apis/musicTracks'

import { secondsToMMSS } from '../../../lib/formatting/time'

import './AudioPlayer.css'

export type CachedSeekPositionType = {
  [playerId: string]: number,
}

/*
  The wide layout's title aims for 24px and sheds size as the title grows, reaching the 16px
  floor around 36 characters. Character count stands in for real text measurement: the budget
  is the title row's ~318px width divided by the ~0.55em average glyph width of the 800 weight.
*/
const WIDE_TITLE_MAX_PX = 24
const WIDE_TITLE_MIN_PX = 16
const WIDE_TITLE_WIDTH_BUDGET = 578

// Font size in px for the wide layout's track title
const wideTitleFontSize = (title: string) => Math.round(
  Math.min(WIDE_TITLE_MAX_PX, Math.max(WIDE_TITLE_MIN_PX, WIDE_TITLE_WIDTH_BUDGET / title.length)),
)

type AudioPlayerProps = {
  className?: string,
  playerId: string,
  size: 'mini' | 'wide',
  onColorsLoaded?: (color: string[]) => void
}

/**
 * One AudioPlayer controls the playback of one audio stream.
 */
const AudioPlayer = ({
  className,
  playerId,
  size,
  onColorsLoaded,
}: PropsWithChildren<AudioPlayerProps>) => {
  const howl = getHowl(playerId)
  const dispatch = useAppDispatch()
  const { enable_glass } = useAppSelector(settingsSelectors.current)
  const playbackTimeInterval = useRef(null)
  const players = useAppSelector(audioSelectors.players)
  const player = players?.[playerId]
  const isPlaying = player.state === PLAYBACK_STATE.PLAYING
  const isPaused = player.state === PLAYBACK_STATE.PAUSED
  const musicBlobLoading = player.state === PLAYBACK_STATE.LOADING
  const [playbackSeconds, setPlaybackSeconds] = useState(0)
  const [bufferedSeconds, setBufferedSeconds] = useState(0)
  const {
    data: musicTrackResponse,
    isLoading: musicTrackLoading,
  } = useGetMusicTrackQuery({ id: player.trackId })
  const track = musicTrackResponse
  const [coverSrc] = useReleaseCover(track?.release?.id, size === 'wide' ? 'medium_nocrop' : 'small_nocrop')
  const coverColors = useCoverColors(coverSrc)
  const [fadeIn, setFadeIn] = useState(false)

  // Rate and volume no longer have controls here (they moved to PlaybackControlBar), but a
  // fresh Howl for a new track still needs the player's stored values re-applied to it.
  const rate = player.rate ?? 1
  const volume = player.volume ?? 1

  // The glass background is derived from the cover art, so its icons and text need to
  // follow suit rather than the theme's static colors, or they can end up unreadable.
  const contrastStyle = enable_glass && coverColors.length > 0 && getContrastTextColor(coverColors) === 'light'
    ? { color: '#fff' }
    : undefined

  const handlePlayClick = (id) => {
    dispatch(play({ trackIds: [id] }))
  }

  const handlePauseClick = () => {
    dispatch(audioActions.pause(player.id))
  }

  const handlePrevClick = async () => {
    const seek = typeof howl?.seek() === 'number' ? (howl.seek() as number) : 0
    const result = await dispatch(previous({ playerId: player.id, seek }))
    if (result.payload && 'resetSeek' in result.payload && result.payload.resetSeek) {
      howl?.seek(0)
    }
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

        try {
          const audioEl = howl._sounds[0]?._node as HTMLAudioElement
          const ranges = audioEl?.buffered
          if (ranges?.length) {
            const currentTime = audioEl.currentTime ?? 0
            let end = 0
            for (let i = 0; i < ranges.length; i++) {
              if (currentTime >= ranges.start(i) && currentTime <= ranges.end(i)) {
                end = ranges.end(i)
                break
              }
            }
            // Fall back to the last range's end if currentTime isn't inside any range yet
            if (end === 0) {
              end = ranges.end(ranges.length - 1)
            }
            setBufferedSeconds(end)
          }
        } catch {
          // buffered ranges can throw if the index changes between length check and access
        }
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

  useEffect(() => {
    if (onColorsLoaded && coverColors) {
      onColorsLoaded(coverColors)
    }
  }, [onColorsLoaded, coverColors])

  /*
    Keep the driver's playback rate in step with the player's stored rate. Applied here
    (like seeking) rather than in useHowler, so the rate lands on the fresh Howl while the
    next track is still loading and an advancing queue keeps the same speed without a blip.
  */
  useEffect(() => {
    howl?.rate(rate)
  }, [howl, player.trackId, rate])

  // Same idea for volume: reapply the stored volume to each fresh Howl. Live dragging is
  // applied straight to the Howl below, so this only runs on real volume/track changes.
  useEffect(() => {
    howl?.volume(volume)
  }, [howl, player.trackId, volume])

  return (
    <div className={clsx("audio-player", className, !!fadeIn && 'fade-in')} data-size={size} data-state={player.state} key={playerId}>
      <div className="metadata no-collapse">
        {size === 'wide'
          ? (
            <MarqueeText
              className="audio-player-track-title"
              title={track?.title}
              style={track?.title
                ? { ...contrastStyle, fontSize: wideTitleFontSize(track.title) }
                : contrastStyle}
            >
              {track?.title}
            </MarqueeText>
          )
          : (
            <p
              className="audio-player-track-title"
              title={track?.title}
              style={contrastStyle}
            >
              {track?.title}
            </p>
          )}
        {/* <p
          className="audio-player-track-release"
          title={i18n['audio-player.release.title'][lang].replace('{release}', track?.release?.title)}
        >
          {track?.release?.title}
        </p> */}
        <p
          className="audio-player-track-artists"
          title={track?.artists?.map((artist) => artist.name)?.join(', ')}
          style={contrastStyle}
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
            className={clsx('audio-player-playback-button', 'prev', 'no-collapse')}
            hoverType={enable_glass ? 'glass' : 'background'}
            style={contrastStyle}
            onClick={() => handlePrevClick()}
          />
          {!!(musicTrackLoading || musicBlobLoading) && <Loading size="s" />}
          {!!isPaused && !musicTrackLoading && !musicBlobLoading &&
            <Icon
              fa="fas fa-play"
              className={clsx('audio-player-playback-button', 'play')}
              hoverType={enable_glass ? 'glass' : 'background'}
              style={contrastStyle}
              onClick={() => handlePlayClick(track?.musicTrackId)}
            />
          }
          {!!isPlaying && !musicTrackLoading && !musicBlobLoading &&
            <Icon
              fa="fas fa-pause"
              className={clsx('audio-player-playback-button', 'pause')}
              hoverType={enable_glass ? 'glass' : 'background'}
              style={contrastStyle}
              onClick={() => handlePauseClick()}
            />
          }
          <Icon
            fa="fas fa-forward"
            className={clsx('audio-player-playback-button', 'next', 'no-collapse')}
            hoverType={enable_glass ? 'glass' : 'background'}
            style={contrastStyle}
            onClick={() => handleNextClick()}
          />
          {size !== 'wide' &&
            <Icon
              fa="fas fa-stop"
              className={clsx('audio-player-playback-button', 'stop', 'no-collapse')}
              hoverType={enable_glass ? 'glass' : 'background'}
              style={contrastStyle}
              onClick={() => handleStopClick()}
            />
          }
        </div>
      </div>
      <div className="scrubber-row">
        {(() => {
          const rawDuration = howl?.duration?.()
          const duration = Number.isFinite(rawDuration) ? rawDuration : (track?.duration ?? 0)
          return (
            <>
              <Scrubber
                className="no-collapse"
                value={playbackSeconds}
                buffered={bufferedSeconds}
                min={0}
                max={duration}
                onChangeEnd={({ value }) => {
                  howl.seek(value)
                }}
              />
              <div className="scrubber-time" style={contrastStyle}>
                <time className="current-time">{secondsToMMSS(playbackSeconds)}</time> <span className="no-collapse">/</span>
                <time className="total-time no-collapse">{duration ? secondsToMMSS(duration) : '--:--'}</time>
              </div>
            </>
          )
        })()}
      </div>
      {size === 'wide' &&
        <PlaybackControlBar playerId={playerId} />
      }
    </div>
  )
}

export default AudioPlayer
