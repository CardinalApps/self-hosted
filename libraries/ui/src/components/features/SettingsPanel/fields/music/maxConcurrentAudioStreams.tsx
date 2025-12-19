import { useEffect } from 'react'
import { getSetting } from '@cardinalapps/app-settings/src'

import { useAppDispatch } from '../../../../../hooks/useAppDispatch'
import { useAppSelector } from '../../../../../hooks/useAppSelector'
import { settingsActions, settingsSelectors } from '../../../../../store/slices/settings'
import { audioActions, audioSelectors } from '../../../../../store/slices/music'

import NumberInput from '../../../../forms/NumberInput'

const maxConcurrentAudioStreams = (app, lang) => {
  const dispatch = useAppDispatch()
  const players = useAppSelector(audioSelectors.players)

  const maxConcurrentPlayingFactory = getSetting('max_concurrent_playing_audio_streams')
  const maxConcurrentPlaying = maxConcurrentPlayingFactory(app, lang)

  const fieldFactory = getSetting('max_concurrent_audio_streams')
  const fieldObj = fieldFactory(app, lang)

  const {
    [maxConcurrentPlaying.slug]: maxPlayingPlayersSetting,
    [fieldObj.slug]: maxPlayersSetting,
  } = useAppSelector(settingsSelectors.current)

  /**
   * The maximum number of concurrently playing players cannot exceed the
   * maximum number of players.
   */
  useEffect(() => {
    if (maxPlayersSetting < maxPlayingPlayersSetting) {
      dispatch(settingsActions.set({
        key: maxConcurrentPlaying.slug,
        value: maxPlayersSetting,
      }))
    }
  }, [maxPlayersSetting])

  /**
   * Stop players in real time as the user lowers the number.
   */
  useEffect(() => {
    const inOrderOfOldest = Object.values(players).sort((a, b) => a?.initializedAt <= b?.initializedAt ? -1 : 1)

    if (maxPlayersSetting as number < inOrderOfOldest.length) {
      const numToTrim = inOrderOfOldest.length - (maxPlayersSetting as number)
      for (let i = 0; i < numToTrim; i++) {
        dispatch(audioActions.stop(inOrderOfOldest[i].id))
      }
    }
  }, [maxPlayersSetting])

  /**
   * Stop players in real time as the user lowers the number.
   */
  useEffect(() => {
    const inOrderOfOldest = Object.values(players).sort((a, b) => a?.initializedAt <= b?.initializedAt ? -1 : 1)

    if (maxPlayersSetting as number < inOrderOfOldest.length) {
      const numToTrim = inOrderOfOldest.length - (maxPlayersSetting as number)
      for (let i = 0; i < numToTrim; i++) {
        dispatch(musicActions.stop(inOrderOfOldest[i].id))
      }
    }
  }, [maxPlayersSetting])

  return Object.freeze({
    ...fieldObj,
    render: ({ value, onChange }) => {
      return (
        <NumberInput
          name={fieldObj.slug}
          value={value || fieldObj.defaultValue}
          min={1}
          max={10}
          onChange={(val) => onChange(val)}
        />
      )
    },
  })
}

export default maxConcurrentAudioStreams
