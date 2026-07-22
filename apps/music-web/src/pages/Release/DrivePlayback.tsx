import { useEffect, useState } from 'react'
import clsx from 'clsx'

import Button from '@cardinalapps/ui/src/components/interaction/Button'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { audioSelectors } from '@cardinalapps/ui/src/store/slices/music'
import { PLAYBACK_STATE } from '@cardinalapps/ui/src/store/slices/music/constants'
import { layoutActions, layoutSelectors } from '@cardinalapps/ui/src/store/slices/layout'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import play, { PlayReturn } from '@cardinalapps/ui/src/store/slices/music/thunks/play'
import { randomHexColor } from '@cardinalapps/ui/src/lib/color/randomHexColor'

import i18n from './i18n.json'

const ACTION_BUTTON_NAME = 'drive-playback'

type DrivePlaybackProps = {
  trackIds: string[],
}

/**
 * The "Drive Playback" action button. Driving is Cardinal's context-aware dynamic queue;
 * until the server grows a dynamic queue type for it, pressing Drive plays the release
 * front to back as a placeholder.
 */
function DrivePlayback({ trackIds }: DrivePlaybackProps) {
  const dispatch = useAppDispatch()
  const { lang } = useAppSelector(settingsSelectors.current)
  const playingIds = useAppSelector(audioSelectors.playingIds)
  const loadingIds = useAppSelector(audioSelectors.loadingIds)
  const players = useAppSelector(audioSelectors.players)
  const [drivePlayerId, setDrivePlayerId] = useState<string | null>(null)
  const [partyTime, setPartyTime] = useState<boolean>(false)
  const { [ACTION_BUTTON_NAME]: storedActionButton } = useAppSelector(layoutSelectors.actionButtons)
  const isPartyTime = partyTime && storedActionButton?.gradientAnimation

  /**
   * Create an action button animation on click. Store it in the store so that
   * all action buttons with this name use the same animation.
   */
  const handleActionButtonClick = () => {
    if (ACTION_BUTTON_NAME) {
      const randomGradient = [
        randomHexColor(),
        randomHexColor(),
        randomHexColor(),
        randomHexColor(),
        randomHexColor(),
        randomHexColor(),
      ]
      const animation = `linear-gradient(-45deg, ${randomGradient.join(',')})`
      dispatch(layoutActions.setActionButton({ buttonName: ACTION_BUTTON_NAME, button: { gradientAnimation: animation } }))
    }
  }

  const handleStartDrive = async () => {
    if (!trackIds.length) return
    const result = await dispatch(play({ trackIds }))
    const generatedPlayerId = (result.payload as PlayReturn)?.create?.[0]?.generatedPlayerId
    if (generatedPlayerId) setDrivePlayerId(generatedPlayerId)
  }

  /*
    Party while the player this button started is still going. TrueShuffle can spot its
    players by their dynamic queue type; the Drive queue type doesn't exist yet, so this
    button tracks the player it created instead.
  */
  useEffect(() => {
    const player = drivePlayerId ? players?.[drivePlayerId] : undefined
    setPartyTime(!!player && (player.state === PLAYBACK_STATE.PLAYING || player.state === PLAYBACK_STATE.LOADING))
  }, [playingIds, loadingIds, players, drivePlayerId])

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
      icon="fas fa-road"
      onClick={handleStartDrive}
      onActionButtonClick={handleActionButtonClick}
    >
      {i18n['music-release.play-actions.drive'][lang]}
    </Button>
  )
}

export default DrivePlayback
