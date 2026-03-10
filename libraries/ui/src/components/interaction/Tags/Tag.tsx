import { useContext } from 'react'
import { RouterContext } from '../../../context/router'

import './Tags.css'

export type TagProps = {
  icon?: string,
  label: string,
  href?: string,
  color?: 'success' | 'warning' | 'danger',
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
  onClick,
}: TagProps) => {
  const { Link } = useContext(RouterContext)
  if (href) {
    return (
      <Link
        to={href}
        className="tag"
        data-color={color}
      >
        {!!icon && <i className={icon} />}{label}
      </Link>
    )
  } else if (onClick) {
    return (
      <button
        key={label}
        className="tag"
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
        className="tag"
        data-color={color}
      >
        {!!icon && <i className={icon} />}{label}
      </span>
    )
  }
}

export default Tag
