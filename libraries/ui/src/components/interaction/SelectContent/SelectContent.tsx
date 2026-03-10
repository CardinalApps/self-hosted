import type { CSSProperties, PropsWithChildren } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

import './SelectContent.css'

type SelectContentProps = {
  className?: string,
  style?: CSSProperties,
  selectorStyle?: CSSProperties,
  name?: string,
  show?: boolean,
  selected?: boolean,
  onFocus?: () => void,
  onSelect?: (name) => void,
  onDeselect?: (name) => void,
  onBlur?: () => void,
}

/**
 * Allow for multiple items of any type of content to be selected.
 */
const SelectContent = ({
  className,
  style,
  selectorStyle,
  name,
  show,
  selected,
  onFocus,
  onSelect,
  onDeselect,
  onBlur,
  children,
}: PropsWithChildren<SelectContentProps>) => {
  const handleClick = () => {
    if (!selected) {
      onSelect?.(name)
    } else {
      onDeselect?.(name)
    }
  }

  return (
    <div
      className={clsx(
        `select-content`,
        show && 'show',
        selected && 'selected',
        className,
      )}
      onFocus={onFocus}
      onBlur={onBlur}
      style={style}
    >
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: show ? 1 : 0 }}
        className={clsx(`selector`)}
        style={selectorStyle}
        onClick={handleClick}
      >
        <motion.div
          className="selected"
          initial={{ transform: 'scale(0)' }}
          animate={{ transform: selected ? 'scale(1)' : 'scale(0)' }}
          transition={{ type: "spring", bounce: 0.4, duration: 0.3 }}
        >
          <i className="fas fa-check" />
        </motion.div>
      </motion.button>
      <div className="selectable-content">
        {children}
      </div>
    </div>
  )
}

export default SelectContent
