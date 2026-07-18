import clsx from 'clsx'
import { useSelector } from 'react-redux'

import { layoutSelectors } from '../../../../../store/slices/layout'

import { ToolbarItemProps, ToolbarItem, ToolbarItemObject, CycleOption } from '../../types'

import './Cycle.css'

export const SLUG = ToolbarItem.CYCLE

export interface CycleToolbarItemObject extends ToolbarItemObject {
  options: CycleOption[],
}

interface CycleToolbarItemProps extends ToolbarItemProps {
  item: CycleToolbarItemObject,
}

/**
 * This toolbar item lets the user click through a fixed set of options one at
 * a time, looping back to the first option after the last.
 */
const ToolbarCycle = ({
  toolbarName,
  item,
  onChange = () => {},
}: CycleToolbarItemProps) => {
  const { [toolbarName]: toolbarValues } = useSelector(layoutSelectors.toolbarValues)
  const slug = item?.slug || SLUG
  const options = item?.options ?? []
  const activeValue = toolbarValues?.[slug] ?? item?.initialValue
  const activeIndex = Math.max(options.findIndex((option) => option.value === activeValue), 0)
  const activeOption = options[activeIndex]

  const onButtonClick = () => {
    const nextOption = options[(activeIndex + 1) % options.length]
    onChange(slug, nextOption.value, toolbarValues)
  }

  if (!activeOption) {
    return null
  }

  return (
    <button
      className="toolbar-button cycle"
      title={activeOption.title}
      onClick={onButtonClick}
    >
      <i className={`toolbar-icon fas ${activeOption.icon}`} />
      <span className="cycle-dots">
        {options.map((option, i) => (
          <span key={option.value} className={clsx('cycle-dot', { active: i === activeIndex })} />
        ))}
      </span>
    </button>
  )
}

export default ToolbarCycle
