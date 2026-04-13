import { getSetting } from '@cardinalapps/app-settings/src'

import ToggleSwitch from '../../../../forms/ToggleSwitch'

const enableHalfRatings = (app, lang) => {
  const fieldFactory = getSetting('enable_half_ratings')
  const field = fieldFactory(app, lang)

  return Object.freeze({
    ...field,
    app: null,
    render: ({ value, onChange }) => {
      return (
        <ToggleSwitch
          value={value}
          onChange={(v) => onChange(v, null)}
          layout="box"
          title={field.label}
          description={field.description}
        />
      )
    },
  })
}

export default enableHalfRatings
