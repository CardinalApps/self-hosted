import { getSetting } from '@cardinalapps/app-settings/src'

import ToggleSwitch from '../../../../forms/ToggleSwitch'

const openAppsInNewTab = (app, lang) => {
  const fieldFactory = getSetting('open_apps_in_new_tab')
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

export default openAppsInNewTab
