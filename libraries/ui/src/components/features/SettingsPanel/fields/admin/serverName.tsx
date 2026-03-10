import { getSetting } from '@cardinalapps/app-settings/src'

import TextInput from '../../../../forms/TextInput'

const serverName = (app, lang) => {
  const fieldFactory = getSetting('server_name')
  const fieldObj = fieldFactory(app, lang)

  const handleServerNameOnChange = (val, onChange) => {
    const valid = (val.match(/[A-Za-z-_1234567890]/gm)?.length === val.length) || val.length === 0
    if (valid) {
      onChange(val)
    }
  }

  return Object.freeze({
    ...fieldObj,
    render: ({ value, onChange }) => {
      return (
        <>
          <TextInput
            name={fieldObj.slug}
            value={value}
            size="l"
            maxLength={64}
            onChange={(val) => handleServerNameOnChange(val, onChange)}
          />
        </>
      )
    },
  })
}

export default serverName
