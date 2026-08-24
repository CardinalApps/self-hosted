import clsx from 'clsx'

import Button from '@cardinalapps/ui/src/components/interaction/Button'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { audioSelectors, Player } from '@cardinalapps/ui/src/store/slices/music'
import { PLAYBACK_STATE } from '@cardinalapps/ui/src/store/slices/music/constants'
import { layoutActions, layoutSelectors } from '@cardinalapps/ui/src/store/slices/layout'
import { DynamicQueueType, QueueSeedMediaType } from '@cardinalapps/ui/src/store/apis/playbackQueues'
import play from '@cardinalapps/ui/src/store/slices/music/thunks/play'
import { randomHexColor } from '@cardinalapps/ui/src/lib/color/randomHexColor'

type DynamicQueueActionButtonProps = {
  seedMediaType?: QueueSeedMediaType,
  seedMediaId?: string,
  dynamicQueueType: DynamicQueueType,
  /** Distinguishes this button's party animation from others of the same dynamicQueueType, e.g. two buttons that can both resolve to "house_mix". Defaults to dynamicQueueType. */
  buttonId?: string,
  icon: string,
  label: string,
  /** Renders the label as a heading, for buttons that title a section of the page. */
  labelAs?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  disabled?: boolean,
}

/**
 * An action button that starts a dynamic queue, optionally seeded by one
 * release or artist. Every press starts a brand new queue on the server; the
 * server keeps it topped up with fitting tracks from there on.
 */
function DynamicQueueActionButton({
  seedMediaType,
  seedMediaId,
  dynamicQueueType,
  buttonId,
  icon,
  label,
  labelAs,
  disabled = false,
}: DynamicQueueActionButtonProps) {
  const dispatch = useAppDispatch()
  const players = useAppSelector(audioSelectors.players)
  const buttonName = buttonId ?? dynamicQueueType
  // Two buttons can resolve to the identical queue (same type + seed), so the party animation
  // is stored per queue, not per button; whichever button last started it owns the party.
  const queueKey = `${dynamicQueueType}:${seedMediaId ?? ''}`
  const { [queueKey]: storedActionButton } = useAppSelector(layoutSelectors.actionButtons)

  /*
    Party while a player of this queue type, with this same seed, is going. The
    queue rides along in the player state, so this survives navigation and stays
    scoped to the release or artist it was started from. A seedless button
    parties only for seedless queues of its type.
  */
  const partyTime = !!Object.values(players).find((player: Player) => (
    player.queue?.dynamicType === dynamicQueueType
    && (player.queue?.seedMediaId ?? null) === (seedMediaId ?? null)
    && (player.state === PLAYBACK_STATE.PLAYING || player.state === PLAYBACK_STATE.LOADING)
  ))
  const isPartyTime = partyTime
    && !!storedActionButton?.gradientAnimation
    && storedActionButton?.activeButtonId === buttonName

  /**
   * Create an action button animation on click, claiming this queue's party for this button.
   */
  const handleActionButtonClick = () => {
    const randomGradient = [
      randomHexColor(),
      randomHexColor(),
      randomHexColor(),
      randomHexColor(),
      randomHexColor(),
      randomHexColor(),
    ]
    const animation = `linear-gradient(-45deg, ${randomGradient.join(',')})`
    dispatch(layoutActions.setActionButton({ buttonName: queueKey, button: { gradientAnimation: animation, activeButtonId: buttonName } }))
  }

  const handleStart = () => {
    dispatch(play({
      queueType: 'dynamic',
      dynamicQueueType,
      ...(seedMediaType && seedMediaId ? { seedMediaType, seedMediaId } : {}),
    }))
  }

  return (
    <Button
      action
      disabled={disabled}
      partyTime={!!isPartyTime}
      partyRoom={(
        <div
          className={clsx('party-room', isPartyTime)}
          style={
            isPartyTime
              ? { backgroundImage: storedActionButton?.gradientAnimation }
              : undefined
          }
        />
      )}
      icon={icon}
      textAs={labelAs}
      onClick={handleStart}
      onActionButtonClick={handleActionButtonClick}
    >
      {label}
    </Button>
  )
}

export default DynamicQueueActionButton
