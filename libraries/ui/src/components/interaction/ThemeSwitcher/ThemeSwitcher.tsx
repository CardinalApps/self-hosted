import type { PropsWithChildren } from 'react'

import './ThemeSwitcher.css'

type ThemeSwitcherProps = {
  value: string,
  onChange: (value) => void,
}

/**
 * ThemeSwitcher.
 *
 */
const ThemeSwitcher = ({
  value,
  onChange = () => {},
}: PropsWithChildren<ThemeSwitcherProps>) => {
  const icons = {
    dark: 'fas fa-sun',
    light: 'fas fa-moon',
  }

  return (
    <div className={`theme-switcher ${value}`}>
      <i className={icons[value]} onClick={() => onChange(value === 'dark' ? 'light' : 'dark')} />
    </div>
  )
}

export default ThemeSwitcher
