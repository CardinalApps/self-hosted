import { useState } from 'react'
import clsx from 'clsx'

import Toolbar from '../../interaction/Toolbar'
import Cycle from '../../interaction/Toolbar/items/Cycle'
import { ToolbarItem } from '../../interaction/Toolbar/types'
import type { ToolbarItems, CycleOption } from '../../interaction/Toolbar/types'
import Popout from '../../layout/Popout'
import Scrubber from '../../interaction/Scrubber'

import { useAppSelector } from '../../../hooks/useAppSelector'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { getHowl } from '../../../hooks/useHowler'

import { audioSelectors, audioActions } from '../../../store/slices/music'
import { REPEAT_MODE, RepeatMode } from '../../../store/slices/music/constants'
import { settingsSelectors } from '../../../store/slices/settings'
import { useGetQueueItemsQuery } from '../../../store/apis/playbackQueues'

import audioPlayerI18n from '../AudioPlayer/i18n'

import './PlaybackControlBar.css'

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
 * Stop, repeat, speed, and volume for the wide player: secondary controls that sit in
 * their own toolbar under the seek bar.
 */
const PlaybackControlBar = ({ playerId }: PlaybackControlBarProps) => {
  const dispatch = useAppDispatch()
  const howl = getHowl(playerId)
  const { enable_glass, lang } = useAppSelector(settingsSelectors.current)
  const players = useAppSelector(audioSelectors.players)
  const player = players?.[playerId]

  const repeat = player?.repeat ?? REPEAT_MODE.OFF
  const rate = player?.rate ?? 1
  const volume = player?.volume ?? 1

  const [ratePopoutIsOpen, setRatePopoutIsOpen] = useState(false)
  const [volumePopoutIsOpen, setVolumePopoutIsOpen] = useState(false)

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

  if (!player) {
    return null
  }

  const title = (key: string) => audioPlayerI18n[key]?.[lang as string]

  // Off -> queue -> track, skipping "queue" when there is nothing to loop
  const repeatOptions: CycleOption[] = [
    { value: REPEAT_MODE.OFF, icon: 'fa-ban', title: title('audio-player.playback.repeat.off') },
    ...(hasMultiItemQueue ? [{ value: REPEAT_MODE.QUEUE, icon: 'fa-retweet', title: title('audio-player.playback.repeat.queue') }] : []),
    { value: REPEAT_MODE.TRACK, icon: 'fa-redo-alt', title: title('audio-player.playback.repeat.track') },
  ]

  // One group per control, so each gets a border of its own
  const items: ToolbarItems = [
    [{
      slug: 'stop',
      title: title('audio-player.playback.stop'),
      render: ToolbarItem.ICON,
      extra: {
        icon: 'fa-stop',
        onClick: () => dispatch(audioActions.stop(player.id)),
      },
    }],
    [{
      slug: 'repeat',
      /*
        The player's repeat mode lives in the music slice, not in the toolbar's own values, so
        the built-in Cycle is rendered directly: the live mode rides in as `initialValue` (the
        toolbar store never holds a value to shadow it) and changes dispatch to the player.
      */
      render: () => (
        <Cycle
          item={{ slug: 'repeat', options: repeatOptions, initialValue: repeat }}
          onChange={(_slug, newVal) => dispatch(audioActions.setRepeat({ playerId: player.id, repeat: newVal as RepeatMode }))}
        />
      ),
    }],
    [{
      slug: 'rate',
      render: () => (
        <Popout
          open={ratePopoutIsOpen}
          onClose={() => setRatePopoutIsOpen(false)}
          position="tc"
          origin="bm"
          offset={10}
          width={128}
          className="playback-rate-popout"
          trigger={
            <button
              className={clsx('toolbar-button', 'rate', rate !== 1 && 'is-active')}
              title={title('audio-player.playback.rate')}
              onClick={() => setRatePopoutIsOpen((open) => !open)}
            >
              <span className="playback-rate-value toolbar-button-hover-highlight">{formatRate(rate)}</span>
            </button>
          }
        >
          {RATE_STEPS.map((step) => (
            <button
              key={step}
              type="button"
              className={clsx('playback-rate-option', step === rate && 'is-selected')}
              onClick={() => {
                dispatch(audioActions.setRate({ playerId: player.id, rate: step }))
                setRatePopoutIsOpen(false)
              }}
            >
              {formatRate(step)}
            </button>
          ))}
        </Popout>
      ),
    }],
    [{
      slug: 'volume',
      render: () => (
        <Popout
          open={volumePopoutIsOpen}
          onClose={() => setVolumePopoutIsOpen(false)}
          position="bm"
          origin="tc"
          offset={10}
          className="playback-volume-popout"
          trigger={
            <button
              className="toolbar-button"
              title={title('audio-player.playback.volume')}
              onClick={() => setVolumePopoutIsOpen((open) => !open)}
            >
              <i className={clsx('toolbar-icon', 'fas', volumeIcon(displayVolume))} />
            </button>
          }
        >
          <div className="playback-volume-slider">
            {/* Drag applies straight to the Howl for instant feedback and tracks a local
                value so the readout follows; the store is written on release so a drag
                does not thrash the persisted state. */}
            <Scrubber
              vertical
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
            <span className="playback-volume-value">{Math.round(displayVolume * 100)}%</span>
          </div>
        </Popout>
      ),
    }],
  ]

  return (
    <div className="playback-control-bar">
      <Toolbar
        name="playback-controls"
        slim
        className={clsx(enable_glass && 'glass')}
        collider=""
        items={items}
      />
    </div>
  )
}

export default PlaybackControlBar
