import { useState } from 'react'
import clsx from 'clsx'

import Icon from '../../typography/Icon'
import MenuButton from '../../interaction/MenuButton'
import Scrubber from '../../interaction/Scrubber'

import { useAppSelector } from '../../../hooks/useAppSelector'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { getHowl } from '../../../hooks/useHowler'
import { useReleaseCover } from '../../../hooks/useReleaseCover'
import { useCoverColors } from '../../../hooks/useCoverColors'
import { getContrastTextColor } from '../../../lib/color/getContrastTextColor'

import { audioSelectors, audioActions } from '../../../store/slices/music'
import { REPEAT_MODE, RepeatMode } from '../../../store/slices/music/constants'
import { settingsSelectors } from '../../../store/slices/settings'
import { useGetMusicTrackQuery } from '../../../store/apis/musicTracks'
import { useGetQueueItemsQuery } from '../../../store/apis/playbackQueues'

import audioPlayerI18n from '../AudioPlayer/i18n'

// The playback speeds on offer. Kept within the range browsers can pitch-preserve; 1 is normal speed.
const RATE_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]

const formatRate = (rate: number) => `${rate}×`

const volumeIcon = (volume: number) => {
  if (volume <= 0) {
    return 'fa-volume-off'
  }
  if (volume < 0.5) {
    return 'fa-volume-down'
  }
  return 'fa-volume-up'
}

type PlaybackControlBarProps = {
  playerId: string,
}

/**
 * Stop, repeat, speed, and volume for the wide player: secondary controls that sit in the
 * queue's header rather than the player itself.
 */
const PlaybackControlBar = ({ playerId }: PlaybackControlBarProps) => {
  const dispatch = useAppDispatch()
  const howl = getHowl(playerId)
  const { enable_glass, lang } = useAppSelector(settingsSelectors.current)
  const players = useAppSelector(audioSelectors.players)
  const player = players?.[playerId]

  const { data: musicTrackResponse } = useGetMusicTrackQuery({ id: player?.trackId }, { skip: !player })
  const track = musicTrackResponse
  const [coverSrc] = useReleaseCover(track?.release?.id)
  const coverColors = useCoverColors(coverSrc)

  const repeat = player?.repeat ?? REPEAT_MODE.OFF
  const rate = player?.rate ?? 1
  const volume = player?.volume ?? 1

  // The store's volume is only written on release, so a live drag value drives the readout
  // and speaker icon in the meantime; it falls back to the stored volume when not dragging
  const [draggingVolume, setDraggingVolume] = useState<number | null>(null)
  const displayVolume = draggingVolume ?? volume

  // "Loop queue" only makes sense with more than one item to loop, so a single-track
  // queue drops it from the cycle. The count is all this needs, so it queries the
  // lightest slice and reads the queue-wide total the endpoint returns alongside it.
  const { data: queueItemsData } = useGetQueueItemsQuery({
    queueId: player?.queue?.queueId ?? '',
    includeCurrentItemInReturn: false,
  }, {
    skip: !player?.queue?.queueId,
  })
  const hasMultiItemQueue = (queueItemsData?.[1] ?? 0) > 1

  // The glass background is derived from the cover art, so these icons need to follow
  // suit rather than the theme's static colors, or they can end up unreadable.
  const contrastStyle = enable_glass && coverColors.length > 0 && getContrastTextColor(coverColors) === 'light'
    ? { color: '#fff' }
    : undefined

  // Cycle off -> queue -> track -> off, skipping "queue" when there is nothing to loop
  const cycleRepeat = () => {
    if (!player) return
    const order: RepeatMode[] = hasMultiItemQueue
      ? [REPEAT_MODE.OFF, REPEAT_MODE.QUEUE, REPEAT_MODE.TRACK]
      : [REPEAT_MODE.OFF, REPEAT_MODE.TRACK]
    const nextMode = order[(order.indexOf(repeat) + 1) % order.length]
    dispatch(audioActions.setRepeat({ playerId: player.id, repeat: nextMode }))
  }

  const handleStopClick = () => {
    if (!player) return
    dispatch(audioActions.stop(player.id))
  }

  if (!player) {
    return null
  }

  return (
    <div className="playback-control-bar">
      <Icon
        fa="fas fa-stop"
        className="audio-player-playback-button stop"
        hoverType={enable_glass ? 'glass' : 'background'}
        style={contrastStyle}
        onClick={() => handleStopClick()}
      />
      <Icon
        fa="fas fa-retweet"
        className={clsx(
          'audio-player-playback-button', 'repeat',
          repeat !== REPEAT_MODE.OFF && 'is-active',
          repeat === REPEAT_MODE.TRACK && 'is-track',
        )}
        hoverType={enable_glass ? 'glass' : 'background'}
        // Active repeat carries its own accent colour, so it skips the glass contrast override
        style={repeat === REPEAT_MODE.OFF ? contrastStyle : undefined}
        title={audioPlayerI18n[`audio-player.playback.repeat.${repeat}`]?.[lang as string]}
        onClick={() => cycleRepeat()}
      />
      <MenuButton
        className={clsx('audio-player-rate', rate !== 1 && 'is-active')}
        solid={false}
        align="right"
        width={128}
        title={audioPlayerI18n['audio-player.playback.rate']?.[lang as string]}
        icon={<span className="audio-player-rate-value" style={rate === 1 ? contrastStyle : undefined}>{formatRate(rate)}</span>}
      >
        <MenuButton.Section>
          {RATE_STEPS.map((step) => (
            <button
              key={step}
              type="button"
              className={clsx('audio-player-rate-option', step === rate && 'is-selected')}
              onClick={() => dispatch(audioActions.setRate({ playerId: player.id, rate: step }))}
            >
              {formatRate(step)}
            </button>
          ))}
        </MenuButton.Section>
      </MenuButton>
      <MenuButton
        className="audio-player-volume"
        solid={false}
        align="right"
        width={190}
        title={audioPlayerI18n['audio-player.playback.volume']?.[lang as string]}
        icon={<i className={clsx('fa-icon', 'fas', volumeIcon(displayVolume))} style={contrastStyle} />}
      >
        <MenuButton.Section>
          <div className="audio-player-volume-slider">
            {/* Drag applies straight to the Howl for instant feedback and tracks a local
                value so the readout follows; the store is written on release so a drag
                does not thrash the persisted state. */}
            <Scrubber
              value={volume}
              min={0}
              max={1}
              onChange={({ value }) => {
                howl?.volume(value)
                setDraggingVolume(value)
              }}
              onChangeEnd={({ value }) => {
                dispatch(audioActions.setVolume({ playerId: player.id, volume: value }))
                setDraggingVolume(null)
              }}
            />
            <span className="audio-player-volume-value">{Math.round(displayVolume * 100)}%</span>
          </div>
        </MenuButton.Section>
      </MenuButton>
    </div>
  )
}

export default PlaybackControlBar
