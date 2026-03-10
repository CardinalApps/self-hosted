import { getSetting } from '@cardinalapps/app-settings/src'

import Card from '../../../../layout/Card'

const accentColor = (app?, lang?) => {
  const fieldFactory = getSetting('accent_color')
  const field = fieldFactory(app, lang)

  return Object.freeze({
    ...field,
    render: ({ value, onChange }) => {
      return (
        <>
          <div className="swatches">
            {Object.keys(field.options).map((hex) => {
              return (
                <Card
                  padding="none"
                  key={hex}
                  className={`swatch ${value === hex ? 'active' : ''}`}
                >
                  <button
                    title={field.options[hex]}
                    style={{ backgroundColor: hex }}
                    onClick={() => onChange(hex)}
                  />
                </Card>
              )
            })
            }
          </div>
        </>
      )
    },
  })
}

export default accentColor
