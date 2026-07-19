import { useEffect, useRef } from 'react'
import type { CSSProperties, PropsWithChildren, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

import useClickOutside from '../../../hooks/useClickOutside'

import './Popout.css'

export type PopoutAnchor = 'tl' | 'tc' | 'tr' | 'ml' | 'mm' | 'mr' | 'bl' | 'bm' | 'br'

const ANCHOR_FRACTIONS: Record<PopoutAnchor, [number, number]> = {
  tl: [0, 0],
  tc: [0.5, 0],
  tr: [1, 0],
  ml: [0, 0.5],
  mm: [0.5, 0.5],
  mr: [1, 0.5],
  bl: [0, 1],
  bm: [0.5, 1],
  br: [1, 1],
}

/**
 * `offset` only makes sense as a push along an axis where the origin and
 * position fractions sit on opposite edges (0 vs 1) — that's the only case
 * where there's a "between the two" gap to open up. Anywhere else (aligned
 * on the same edge, or centered) there's no natural direction to push in.
 */
const getOffsetDirection = (originFraction: number, positionFraction: number) => {
  if (originFraction === 1 && positionFraction === 0) return 1
  if (originFraction === 0 && positionFraction === 1) return -1
  return 0
}

const getAxisPosition = (originFraction: number, positionFraction: number, offset: number) => {
  const base = `${originFraction * 100}%`
  const direction = getOffsetDirection(originFraction, positionFraction)
  return direction === 0 ? base : `calc(${base} + ${direction * offset}px)`
}

type PopoutProps = {
  trigger: ReactNode,
  open: boolean,
  onClose?: () => void,
  position?: PopoutAnchor,
  origin?: PopoutAnchor,
  offset?: number,
  width?: number,
  title?: string,
  className?: string,
  /* Extra classes for the floating panel itself; `className` lands on the anchor wrapper */
  innerClassName?: string,
}

/**
 * Popout pairs a floating panel with any clickable trigger element. `origin`
 * is the point on the trigger to anchor to, `position` is the point on the
 * popout that gets placed there, and `offset` adds a pixel gap between the
 * two along whichever axes they don't already share. For example, to open
 * below and to the right of a button with a 10px gap, with the popout's
 * top-left corner meeting the button's bottom-right corner:
 *
 *   <Popout trigger={...} position="tl" origin="br" offset={10}>
 */
const Popout = ({
  trigger,
  open,
  onClose = () => {},
  position = 'tl',
  origin = 'bl',
  offset = 0,
  width,
  title,
  className,
  innerClassName,
  children,
}: PropsWithChildren<PopoutProps>) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { clickedOutside, resetClickOutside } = useClickOutside(wrapperRef)

  useEffect(() => {
    if (!clickedOutside) return
    if (open) onClose()
    resetClickOutside()
  }, [clickedOutside])

  const [originX, originY] = ANCHOR_FRACTIONS[origin]
  const [positionX, positionY] = ANCHOR_FRACTIONS[position]

  const outerStyle: CSSProperties = {
    left: getAxisPosition(originX, positionX, offset),
    top: getAxisPosition(originY, positionY, offset),
  }

  const innerStyle: CSSProperties = {
    transform: `translate(${-positionX * 100}%, ${-positionY * 100}%)`,
    ...(width ? { width } : {}),
  }

  return (
    <div ref={wrapperRef} className={clsx('popout-anchor', className)}>
      {trigger}
      <AnimatePresence>
        {!!open && (
          <motion.div
            className="popout-box"
            style={outerStyle}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { type: 'spring', mass: 0.1 } }}
            exit={{ opacity: 0, y: -4, transition: { type: 'spring', mass: 0.1 } }}
          >
            <div className={clsx('popout-inner', innerClassName)} style={innerStyle}>
              {title && <p className="popout-title">{title}</p>}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Popout
