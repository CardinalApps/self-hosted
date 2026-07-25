import { useContext } from 'react'
import clsx from 'clsx'
import { RouterContext } from '../../../context/router'

import './Tags.css'

export type TagSize = 'regular' | 'small'

export type TagProps = {
  icon?: string,
  label: string,
  href?: string,
  color?: 'success' | 'warning' | 'danger',
  /** Small tags are for dense places, like a tooltip or a metadata line. */
  size?: TagSize,
  onClick?: (e) => void,
}

/**
 * A single tag.
 */
const Tag = ({
  icon,
  label,
  href,
  color,
  size = 'regular',
  onClick,
}: TagProps) => {
  const { Link } = useContext(RouterContext)
  const className = clsx('tag', size !== 'regular' && `size-${size}`)

  if (href) {
    return (
      <Link
        to={href}
        className={className}
        data-color={color}
      >
        {!!icon && <i className={icon} />}{label}
      </Link>
    )
  } else if (onClick) {
    return (
      <button
        key={label}
        className={className}
        type="button"
        data-color={color}
        onClick={(e) => onClick(e)}
      >
        {!!icon && <i className={icon} />}{label}
      </button>
    )
  } else {
    return (
      <span
        key={label}
        className={className}
        data-color={color}
      >
        {!!icon && <i className={icon} />}{label}
      </span>
    )
  }
}

export default Tag
