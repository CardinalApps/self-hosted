import { useState } from 'react'
import { fn } from '@storybook/test'
import type { Meta } from '@storybook/react'

import Checkbox from './Checkbox'

const meta = {
  title: 'Forms/Checkbox',
  component: Checkbox,
  argTypes: {},
} satisfies Meta<typeof Checkbox>

export const Default = () => {
  const [checked, setChecked] = useState(false)
  return (
    <Checkbox
      name="checkbox-default"
      checked={checked}
      onChange={(v) => setChecked(v)}
    />
  )
}

export const InitiallyChecked = () => {
  const [checked, setChecked] = useState(true)
  return (
    <Checkbox
      name="checkbox-checked"
      checked={checked}
      onChange={(v) => setChecked(v)}
    />
  )
}

export const Disabled = () => {
  return (
    <Checkbox
      name="checkbox-disabled"
      checked={false}
      disabled={true}
      onChange={fn()}
    />
  )
}

export const DisabledChecked = () => {
  return (
    <Checkbox
      name="checkbox-disabled-checked"
      checked={true}
      disabled={true}
      onChange={fn()}
    />
  )
}

export const MultipleInAGroup = () => {
  const [values, setValues] = useState({ music: true, photos: false, cinema: true })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(Object.keys(values) as Array<keyof typeof values>).map((key) => (
        <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
          <Checkbox
            name={`checkbox-${key}`}
            checked={values[key]}
            onChange={(v) => setValues({ ...values, [key]: v })}
          />
          <span style={{ textTransform: 'capitalize' }}>{key}</span>
        </label>
      ))}
    </div>
  )
}

export default meta
