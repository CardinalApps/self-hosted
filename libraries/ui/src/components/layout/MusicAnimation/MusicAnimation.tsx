import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './MusicAnimation.css'

type MusicAnimationProps = {
  size?: 's' | 'm',
  isAnimating?: boolean,
  onClick?: () => void,
}

const MusicAnimation = ({
  size = 's',
  isAnimating = true,
  onClick,
}: PropsWithChildren<MusicAnimationProps>) => {
  return (
    <button className={clsx('playing-music-animation', isAnimating && 'anim')} data-size={size} onClick={() => onClick?.()}>
      <span className="bar bar-1" />
      <span className="bar bar-2" />
      <span className="bar bar-3" />
    </button>
  )
}

export default MusicAnimation
