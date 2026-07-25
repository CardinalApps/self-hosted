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

type MixButtonProps = {
  seedMediaType: QueueSeedMediaType,
  seedMediaId: string,
  dynamicQueueType: DynamicQueueType,
  icon: string,
  label: string,
}

/**
 * An action button that starts a dynamic queue seeded by one release or artist.
 * Every press starts a brand new queue on the server; the server keeps it topped
 * up with fitting tracks from there on.
 */
function MixButton({
  seedMediaType,
  seedMediaId,
  dynamicQueueType,
  icon,
  label,
}: MixButtonProps) {
  const dispatch = useAppDispatch()
  const players = useAppSelector(audioSelectors.players)
  const { [dynamicQueueType]: storedActionButton } = useAppSelector(layoutSelectors.actionButtons)

  /*
    Party while a player of this queue type, seeded by this same media, is going.
    The queue rides along in the player state, so this survives navigation and
    stays scoped to the release or artist it was started from.
  */
  const partyTime = !!Object.values(players).find((player: Player) => (
    player.queue?.dynamicType === dynamicQueueType
    && player.queue?.seedMediaId === seedMediaId
    && (player.state === PLAYBACK_STATE.PLAYING || player.state === PLAYBACK_STATE.LOADING)
  ))
  const isPartyTime = partyTime && storedActionButton?.gradientAnimation

  /**
   * Create an action button animation on click. Store it in the store so that
   * all action buttons with this name use the same animation.
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
    dispatch(layoutActions.setActionButton({ buttonName: dynamicQueueType, button: { gradientAnimation: animation } }))
  }

  const handleStart = () => {
    dispatch(play({
      queueType: 'dynamic',
      dynamicQueueType,
      seedMediaType,
      seedMediaId,
    }))
  }

  return (
    <Button
      action
      partyTime={!!isPartyTime}
      partyRoom={(
        <div
          className={clsx('party-room', partyTime)}
          style={
            partyTime
              ? { backgroundImage: storedActionButton.gradientAnimation }
              : undefined
          }
        />
      )}
      icon={icon}
      onClick={handleStart}
      onActionButtonClick={handleActionButtonClick}
    >
      {label}
    </Button>
  )
}

export default MixButton
