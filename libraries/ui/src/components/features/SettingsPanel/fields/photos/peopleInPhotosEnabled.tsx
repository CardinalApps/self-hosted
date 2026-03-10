import { getSetting } from '@cardinalapps/app-settings/src'

import ToggleSwitch from '../../../../forms/ToggleSwitch'

const peopleInPhotosEnabled = (app, lang) => {
  const fieldFactory = getSetting('enable_people_in_photos')
  const field = fieldFactory(app, lang)

  return Object.freeze({
    ...field,
    render: ({ value, onChange }) => {
      return (
        <ToggleSwitch
          value={value}
          onChange={onChange}
          showActiveLabel={true}
          labelAlign='left'
        />
      )
    },
  })
}

export default peopleInPhotosEnabled
