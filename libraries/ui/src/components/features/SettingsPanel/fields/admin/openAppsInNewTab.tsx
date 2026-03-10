import { getSetting } from '@cardinalapps/app-settings/src'

import ToggleSwitch from '../../../../forms/ToggleSwitch'

const openAppsInNewTab = (app, lang) => {
  const fieldFactory = getSetting('open_apps_in_new_tab')
  const field = fieldFactory(app, lang)

  return Object.freeze({
    ...field,
    render: ({ value, onChange }) => {
      return (
        <>
          <ToggleSwitch
            value={value}
            onChange={(v) => onChange(v, null)}
            layout="box"
            title={field.label}
            description={field.description}
          />
        </>
      )
    },
  })
}

export default openAppsInNewTab
