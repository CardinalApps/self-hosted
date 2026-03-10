import { useState } from 'react'
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
      name={'checkybox'}
      checked={checked}
      onChange={(checked) => setChecked(checked)}
    />
  )
}

export default meta
