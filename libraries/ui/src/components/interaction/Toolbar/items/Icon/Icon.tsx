import { ToolbarItemProps, ToolbarItem, ToolbarItemObject } from '../../types'

import './Icon.css'

export const SLUG = ToolbarItem.ICON

export type IconExtra = {
  icon: string,
  onClick?: () => void,
}

export interface IconToolbarItemObject extends ToolbarItemObject {
  extra: IconExtra,
}

interface IconToolbarItemProps extends ToolbarItemProps {
  item: IconToolbarItemObject,
}

/**
 * This toolbar item renders a single static icon button. Unlike Cycle, it has
 * no internal state to advance through — clicking it just invokes whatever
 * `onClick` the caller supplied.
 */
const ToolbarIcon = ({ item }: IconToolbarItemProps) => {
  const { icon, onClick } = item?.extra ?? {}

  if (!icon) {
    return null
  }

  return (
    <button
      className="toolbar-button icon"
      title={item?.title}
      onClick={onClick}
    >
      <i className={`toolbar-icon fas ${icon}`} />
    </button>
  )
}

export default ToolbarIcon
