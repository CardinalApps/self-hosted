import { useEffect } from 'react'
import { getSetting } from '@cardinalapps/app-settings/src'

import NumberInput from '../../../../forms/NumberInput'

import { useAppDispatch } from '../../../../../hooks/useAppDispatch'
import { useAppSelector } from '../../../../../hooks/useAppSelector'
import { settingsSelectors } from '../../../../../store/slices/settings'
import { audioActions, audioSelectors } from '../../../../../store/slices/music'

const maxConcurrentPlayingAudioStreams = (app, lang) => {
  const dispatch = useAppDispatch()
  const players = useAppSelector(audioSelectors.players)

  const maxPlayersFactory = getSetting('max_concurrent_audio_streams')
  const maxPlayers = maxPlayersFactory(app, lang)

  const fieldFactory = getSetting('max_concurrent_playing_audio_streams')
  const fieldObj = fieldFactory(app, lang)

  const {
    [maxPlayers.slug]: maxPlayersSetting,
    [fieldObj.slug]: maxPlayingPlayersSetting,
  } = useAppSelector(settingsSelectors.current)

  /**
   * Stop players in real time as the user lowers the number.
   */
  useEffect(() => {
    const inOrderOfOldest = Object.values(players).sort((a, b) => a?.initializedAt <= b?.initializedAt ? -1 : 1)

    if (maxPlayingPlayersSetting as number < inOrderOfOldest.length) {
      const numToPause = inOrderOfOldest.length - (maxPlayingPlayersSetting as number)
      for (let i = 0; i < numToPause; i++) {
        dispatch(audioActions.pause(inOrderOfOldest[i].id))
      }
    }
  }, [maxPlayingPlayersSetting])

  return Object.freeze({
    ...fieldObj,
    render: ({ value, onChange }) => {
      return (
        <NumberInput
          name={fieldObj.slug}
          value={value || fieldObj.defaultValue}
          min={1}
          max={parseInt(maxPlayersSetting as string)}
          onChange={(val) => onChange(val)}
        />
      )
    },
  })
}

export default maxConcurrentPlayingAudioStreams
