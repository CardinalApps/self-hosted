import type { PropsWithChildren, CSSProperties, ReactNode } from 'react'

import { LoadingIcon } from './icons'

import './Loading.css'

type LoadingProps = {
  size?: 'xs' | 's' | 'm' | 'l',
  speed?: string,
  color?: string,
  className?: string,
  style?: CSSProperties,
  inline?: boolean,
  children?: ReactNode,
}

const Loading = ({
  size = 'm',
  speed = '1s',
  color = 'var(--text-color-1)',
  className = '',
  style,
  inline = false,
  children,
}: PropsWithChildren<LoadingProps>) => {
  if (inline) {
    return (
      <span className={`loading-indicator inline ${className} size-${size}`} style={style}>
        <LoadingIcon speed={speed} color={color} />
        {children}
      </span>
    )
  } else {
    return (
      <div className={`loading-indicator ${className} size-${size}`} style={style}>
        <LoadingIcon speed={speed} color={color} />
        {children}
      </div>
    )
  }
}

export default Loading
