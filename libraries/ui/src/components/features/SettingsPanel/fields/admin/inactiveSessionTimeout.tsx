import { getSetting } from '@cardinalapps/app-settings/src'

import Select from '../../../../forms/Select/Select'

const inactiveSessionTimeout = (app?, lang?) => {
  const fieldFactory = getSetting('inactive_session_timeout')
  const fieldObj = fieldFactory(app, lang)

  return Object.freeze({
    ...fieldObj,
    render: ({ value, onChange }) => {
      return (
        <Select
          options={fieldObj.options as Record<string, string>}
          value={value}
          onChange={onChange}
        />
      )
    },
  })
}

export default inactiveSessionTimeout
