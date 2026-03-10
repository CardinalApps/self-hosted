import { getSetting } from '@cardinalapps/app-settings/src'

import Select from '../../../../forms/Select'

const theme = (app?, lang?) => {
  const fieldFactory = getSetting('theme')
  const field = fieldFactory(app, lang)

  return Object.freeze({
    ...field,
    render: ({ value, onChange }) => {
      return (
        <Select
          name={field.slug}
          options={field.options as Record<string, string>}
          value={value}
          min={1}
          multi={false}
          onChange={onChange}
        />
      )
    },
  })
}

export default theme
