import { getSetting } from '@cardinalapps/app-settings/src'

import NumberInput from '../../../../forms/NumberInput'

const maxRating = (app, lang) => {
  const fieldFactory = getSetting('max_rating')
  const fieldObj = fieldFactory(app, lang)

  return Object.freeze({
    ...fieldObj,
    render: ({ value, onChange }) => {
      return (
        <NumberInput
          name={fieldObj.slug}
          value={value || fieldObj.defaultValue}
          min={1}
          max={10}
          onChange={(val) => onChange(val)}
        />
      )
    },
  })
}

export default maxRating
