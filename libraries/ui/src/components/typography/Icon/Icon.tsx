import type { PropsWithChildren, ReactNode, MouseEvent, CSSProperties } from 'react'
import clsx from 'clsx'

import './Icon.css'

type IconProps = {
  icon?: ReactNode,
  fa?: string,
  title?: string,
  hoverType?: 'background' | 'icon' | 'glass' | null,
  href?: string,
  target?: string,
  className?: string,
  iconClassName?: string,
  style?: CSSProperties,
  onClick?: (e: MouseEvent) => void,
}

/**
 * Icon.
 */
const Icon = ({
  icon,
  fa, // font awesome
  title,
  hoverType = 'background',
  href,
  target,
  className,
  iconClassName,
  style,
  onClick,
}: PropsWithChildren<IconProps>) => {
  const iconEl = fa
    ? <i className={clsx('fa-icon', fa, iconClassName)} style={style} />
    : icon

  if (href) {
    return (
      <a href={href} className={clsx('app-icon', 'href-icon', className)} target={target} title={title} onClick={onClick} data-hover-type={hoverType} style={style}>
        {iconEl}
      </a>
    )
  } else {
    if (onClick) {
      return (
        <button type="button" className={clsx('app-icon', 'button-icon', className)} title={title} onClick={onClick} data-hover-type={hoverType} style={style}>
          {iconEl}
        </button>
      )
    } else {
      return (
        <span className={clsx('span-icon', className)} title={title} onClick={onClick} data-hover-type={hoverType} style={style}>
          {iconEl}
        </span>
      )
    }
  }
}

export default Icon
