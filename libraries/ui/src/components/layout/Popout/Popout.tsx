import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

/*
  The anchors laid out as [y][x], so a placement can be taken apart into a fraction per axis and
  put back together again. Spelled out rather than derived from the letters, because the centre
  column is named 'c' on the top row but 'm' on the middle and bottom ones.
*/
const ANCHOR_GRID: PopoutAnchor[][] = [
  ['tl', 'tc', 'tr'],
  ['ml', 'mm', 'mr'],
  ['bl', 'bm', 'br'],
]

const toAnchor = (xFraction: number, yFraction: number) => ANCHOR_GRID[yFraction * 2][xFraction * 2]

// How close the panel may sit to a viewport edge before it counts as overflowing
const VIEWPORT_MARGIN = 8

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

/**
 * Where the panel's leading edge lands on one axis, in viewport coordinates. Derived from the
 * trigger and the panel's own size, so it can be asked of a placement the panel isn't using yet.
 */
const getAxisStart = (
  triggerStart: number,
  triggerSize: number,
  originFraction: number,
  positionFraction: number,
  offset: number,
  panelSize: number,
) => {
  const direction = getOffsetDirection(originFraction, positionFraction)
  return triggerStart + (originFraction * triggerSize) + (direction * offset) - (positionFraction * panelSize)
}

// How far the panel would spill past either viewport edge, in pixels, for a candidate placement
const getOverflow = (start: number, panelSize: number, viewportSize: number) => {
  const before = Math.max(0, VIEWPORT_MARGIN - start)
  const after = Math.max(0, (start + panelSize) - (viewportSize - VIEWPORT_MARGIN))
  return before + after
}

/**
 * The placements to consider for one axis, best first. An axis the panel opens *along* (the one
 * `offset` pushes on) flips to the far side of the trigger, which is the familiar
 * drop-down-becomes-drop-up. An axis it merely lines up on can't flip — mirroring a centred anchor
 * returns the same anchor — so it re-aligns to whichever trigger edge pulls it back on screen.
 */
const getAxisCandidates = (originFraction: number, positionFraction: number) => {
  const preferred: [number, number] = [originFraction, positionFraction]

  if (getOffsetDirection(originFraction, positionFraction) !== 0) {
    return [preferred, [1 - originFraction, 1 - positionFraction] as [number, number]]
  }

  return [preferred, [1, 1] as [number, number], [0, 0] as [number, number]]
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
  const panelRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState({ position, origin })
  const { clickedOutside, resetClickOutside } = useClickOutside(wrapperRef)

  /*
    Pick the placement that spills the least off screen, per axis, keeping the asked-for one on a
    tie. Least-overflow rather than first-that-fits so a trigger jammed against an edge still gets
    the best of a bad set. Measured from the trigger and the panel's own size rather than from
    where the panel currently sits, so the answer doesn't depend on the placement already applied
    and can't oscillate.
  */
  useLayoutEffect(() => {
    if (!open) {
      setPlacement({ position, origin })
      return
    }

    const measure = () => {
      const trigger = wrapperRef.current?.getBoundingClientRect()
      const panel = panelRef.current?.getBoundingClientRect()
      if (!trigger || !panel) return

      const resolveAxis = (
        triggerStart: number,
        triggerSize: number,
        panelSize: number,
        viewportSize: number,
        originFraction: number,
        positionFraction: number,
      ) => {
        const candidates = getAxisCandidates(originFraction, positionFraction)
        let best = candidates[0]
        let bestOverflow = Infinity

        candidates.forEach(([candidateOrigin, candidatePosition]) => {
          const start = getAxisStart(triggerStart, triggerSize, candidateOrigin, candidatePosition, offset, panelSize)
          const overflow = getOverflow(start, panelSize, viewportSize)
          if (overflow < bestOverflow) {
            best = [candidateOrigin, candidatePosition]
            bestOverflow = overflow
          }
        })

        return best
      }

      const [originX, positionX] = resolveAxis(
        trigger.left, trigger.width, panel.width, window.innerWidth,
        ANCHOR_FRACTIONS[origin][0], ANCHOR_FRACTIONS[position][0],
      )
      const [originY, positionY] = resolveAxis(
        trigger.top, trigger.height, panel.height, window.innerHeight,
        ANCHOR_FRACTIONS[origin][1], ANCHOR_FRACTIONS[position][1],
      )

      setPlacement({
        origin: toAnchor(originX, originY),
        position: toAnchor(positionX, positionY),
      })
    }

    measure()

    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)

    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, position, origin, offset, width])

  useEffect(() => {
    if (!clickedOutside) return
    if (open) onClose()
    resetClickOutside()
  }, [clickedOutside])

  /* Esc closes the popout and stops there — swallowed in the capture phase so outer layers
     with their own document-level Esc handlers (modals, sidebars) don't also react. */
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopImmediatePropagation()
      onClose()
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  const [originX, originY] = ANCHOR_FRACTIONS[placement.origin]
  const [positionX, positionY] = ANCHOR_FRACTIONS[placement.position]

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
            <div ref={panelRef} className={clsx('popout-inner', innerClassName)} style={innerStyle}>
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
