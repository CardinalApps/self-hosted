import { getSetting } from '@cardinalapps/app-settings/src'

import ToggleSwitch from '../../../../forms/ToggleSwitch'

const floatingPlaybackSidebar = (app, lang) => {
  const fieldFactory = getSetting('floating_playback_sidebar')
  const fieldObj = fieldFactory(app, lang)

  return Object.freeze({
    ...fieldObj,
    render: ({ value, onChange }) => {
      return (
        <ToggleSwitch
          value={value}
          onChange={onChange}
          layout="box"
          title={fieldObj.label}
          description={fieldObj.description}
        />
      )
    },
  })
}

export default floatingPlaybackSidebar
