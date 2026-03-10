import { useEffect, useState } from 'react'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import { PLAYBACK_STATE } from '@cardinalapps/ui/src/store/slices/music/constants'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import play from '@cardinalapps/ui/src/store/slices/music/thunks/play'
import { randomHexColor } from '@cardinalapps/ui/src/lib/color/randomHexColor'

import i18n from '../i18n.json'
import { audioSelectors, Player } from '@cardinalapps/ui/src/store/slices/music'
import { layoutActions, layoutSelectors } from '@cardinalapps/ui/src/store/slices/layout'
import clsx from 'clsx'

const ACTION_BUTTON_NAME = 'true-shuffle'

function ActionButtons() {
  const dispatch = useAppDispatch()
  const { lang } = useAppSelector(settingsSelectors.current)
  const playingIds = useAppSelector(audioSelectors.playingIds)
  const loadingIds = useAppSelector(audioSelectors.loadingIds)
  const players = useAppSelector(audioSelectors.players)
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

  const handleStartTrueShuffle = () => {
    dispatch(play({
      queueType: 'dynamic',
      dynamicQueueType: 'true_shuffle',
    }))
  }

  useEffect(() => {
    const atLeastOnePlayerPlayerIsTrueShuffle = Object.values(players).find((player: Player) => {
      return (
        player.queue?.dynamicType === 'true_shuffle'
        && (
          player.state === PLAYBACK_STATE.PLAYING
          || player.state === PLAYBACK_STATE.LOADING
        )
      )
    })
    setPartyTime(!!atLeastOnePlayerPlayerIsTrueShuffle)
  }, [playingIds, loadingIds])

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
      icon="fas fa-random"
      onClick={handleStartTrueShuffle}
      onActionButtonClick={handleActionButtonClick}
    >
      {i18n['action-buttons.true-shuffle'][lang]}
    </Button>
  )
}

export default ActionButtons
