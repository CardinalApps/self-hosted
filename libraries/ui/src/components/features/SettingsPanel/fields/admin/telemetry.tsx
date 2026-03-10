import { getSetting } from '@cardinalapps/app-settings/src'

import ToggleSwitch from '../../../../forms/ToggleSwitch'

import Field from '../../Field'

const telemetry = (app, lang) => {
  const fieldFactory = getSetting('telemetry')
  const field = fieldFactory(app, lang)

  return Object.freeze({
    ...field,
    render: ({ value, onChange }) => {
      return (
        <Field field={field}>
          <ToggleSwitch
            name={field.slug}
            value={value}
            onChange={onChange}
            layout="box"
            title={field.label}
            description={field.description}
          />
        </Field>
      )
    },
  })
}

export default telemetry
