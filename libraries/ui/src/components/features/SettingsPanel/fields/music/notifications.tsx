import { getSetting } from '@cardinalapps/app-settings/src'

import ToggleSwitch from '../../../../forms/ToggleSwitch'

const notifications = (app, lang) => {
  const fieldFactory = getSetting('notifications')
  const fieldObj = fieldFactory(app, lang)

  return Object.freeze({
    ...fieldObj,
    render: ({ value, onChange }) => {
      return (
        <ToggleSwitch
          value={value}
          onChange={onChange}
          showActiveLabel={true}
          labelAlign='left'
        />
      )
    },
  })
}

export default notifications
