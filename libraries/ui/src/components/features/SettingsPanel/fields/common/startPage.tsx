import { getSetting } from '@cardinalapps/app-settings/src'

import Select from '../../../../forms/Select/Select'

const startPage = (app, lang) => {
  const fieldFactory = getSetting('start_page')
  const field = fieldFactory(app, lang)

  return Object.freeze({
    ...field,
    render: ({ value, onChange }) => {
      return (
        <Select
          label={field.label}
          name={field.slug}
          options={field.options as Record<string, string>}
          value={value}
          multi={false}
          onChange={onChange}
        />
      )
    },
  })
}

export default startPage
