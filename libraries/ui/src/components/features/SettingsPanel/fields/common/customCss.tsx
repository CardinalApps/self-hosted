import { getSetting } from '@cardinalapps/app-settings/src'

import Textarea from '../../../../forms/Textarea'

const customCss = (app, lang) => {
  const fieldFactory = getSetting('custom_css')
  const fieldObj = fieldFactory(app, lang)

  return Object.freeze({
    ...fieldObj,
    render: ({ value, onChange }) => {
      return (
        <Textarea
          name={fieldObj.slug}
          value={value}
          onChange={onChange}
        />
      )
    },
  })
}

export default customCss
