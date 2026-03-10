import { useState } from 'react'
import type { Meta } from '@storybook/react'

import ThemeSwitcher from './ThemeSwitcher'

const meta = {
  title: 'Interaction/ThemeSwitcher',
  component: ThemeSwitcher,
  argTypes: {},
} satisfies Meta<typeof ThemeSwitcher>

export const Default = () => {
  const [theme, setTheme] = useState('dark')
  return (
    <ThemeSwitcher
      value={theme}
      onChange={setTheme}
    />
  )
}

export default meta
