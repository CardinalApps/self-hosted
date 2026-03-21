import { getSetting } from '@cardinalapps/app-settings/src'

import NumberInput from '../../../../forms/NumberInput'

const audioPlaybackTimeout = (app, lang) => {
  const fieldFactory = getSetting('audio_playback_timeout')
  const fieldObj = fieldFactory(app, lang)

  return Object.freeze({
    ...fieldObj,
    render: ({ value, onChange }) => {
      return (
        <NumberInput
          name={fieldObj.slug}
          value={value || fieldObj.defaultValue}
          min={250}
          max={30000}
          onChange={(val) => onChange(val)}
        />
      )
    },
  })
}

export default audioPlaybackTimeout
