import { getSetting } from '@cardinalapps/app-settings/src'

import ThemeField from './ThemeField'

const theme = (app?, lang?) => {
  const fieldFactory = getSetting('theme')
  const field = fieldFactory(app, lang)

  return Object.freeze({
    ...field,
    render: ({ value, onChange }) => {
      return (
        <ThemeField
          field={{ slug: field.slug, options: field.options as Record<string, string> }}
          value={value}
          onChange={onChange}
        />
      )
    },
  })
}

export default theme
