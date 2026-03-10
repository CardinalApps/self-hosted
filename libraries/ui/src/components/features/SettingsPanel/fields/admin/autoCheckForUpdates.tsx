import { getSetting } from '@cardinalapps/app-settings/src'

import ToggleSwitch from '../../../../forms/ToggleSwitch'

const autoCheckForUpdates = (app, lang) => {
  const fieldFactory = getSetting('auto_check_for_updates')
  const field = fieldFactory(app, lang)

  return Object.freeze({
    ...field,
    render: ({ value, onChange }) => {
      return (
        <ToggleSwitch
          value={value}
          onChange={onChange}
          layout="box"
          title={field.label}
          description={field.description}
        />
      )
    },
  })
}

export default autoCheckForUpdates
