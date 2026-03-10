import { useState } from 'react'
import type { Meta } from '@storybook/react'

import SelectContent from './SelectContent'

const meta = {
  title: 'Interaction/SelectContent',
  component: SelectContent,
  argTypes: {},
} satisfies Meta<typeof SelectContent>

export const SelectDiv = () => {
  const [selected, setSelected] = useState<boolean>()
  return (
    <SelectContent
      name="test-square"
      show={true}
      selected={selected}
      onSelect={() => setSelected(true)}
      onDeselect={() => setSelected(false)}
      style={{ width: 300, height: 300, position: 'relative' }}
    >
      <div style={{ width: 300, height: 300, backgroundColor: '#3a727e' }} />
    </SelectContent>
  )
}

export default meta
