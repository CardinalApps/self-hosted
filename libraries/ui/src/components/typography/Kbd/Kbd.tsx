import clsx from 'clsx'

import { shortcutKeycaps } from '../../../lib/shortcuts/keycaps'

import './Kbd.css'

type KbdProps = {
  // A shortcut in stored notation, eg. `mod+shift+p`
  keys: string,
  size?: 'm' | 's',
  className?: string,
}

/**
 * Draws a keyboard shortcut as the keycaps it is pressed on, named the way the current
 * platform labels them.
 */
const Kbd = ({ keys, size = 'm', className }: KbdProps) => {
  const caps = shortcutKeycaps(keys)

  return (
    <span className={clsx('kbd', `size-${size}`, className)}>
      {caps.map((cap, index) => (
        <kbd key={`${cap.token}-${index}`} className={clsx('keycap', cap.modifier && 'modifier')}>
          {cap.label}
        </kbd>
      ))}
    </span>
  )
}

export default Kbd
