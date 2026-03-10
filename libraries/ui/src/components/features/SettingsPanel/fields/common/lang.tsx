import { getSetting } from '@cardinalapps/app-settings/src'

import Select from '../../../../forms/Select/Select'

const lang = (app?, lang?) => {
  const langFieldFactory = getSetting('lang')
  const langObj = langFieldFactory(app, lang)

  return Object.freeze({
    ...langObj,
    render: ({ value, onChange }) => {
      return (
        <Select
          options={langObj.options as Record<string, string>}
          value={value}
          onChange={onChange}
        />
      )
    },
  })
}

export default lang
