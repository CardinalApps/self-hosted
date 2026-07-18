import { useEffect, useRef, useState, CSSProperties } from 'react'
import clsx from 'clsx'

import './MarqueeText.css'

/*
  One marquee cycle: hold on the first frame so the start can be read, travel left at a
  constant speed, hold on the last frame, then blink back home. There is no backwards
  travel — text can't be read in reverse — so the return is a fade-out, an invisible
  snap to the start, and a fade-in.
*/
const HOLD_START_MS = 5000
const HOLD_END_MS = 5000
const FADE_MS = 150

/*
  A fade on the right edge hints that there is more text ahead. It disappears the moment
  the travel lands (nothing is clipped on the right anymore, and the tail shouldn't be
  dimmed while it is being read) and returns with the reset back to the beginning.
*/
const EDGE_FADE_PX = 16

type MarqueeTextProps = {
  className?: string,
  style?: CSSProperties,
  title?: string,
  /* Travel speed in px/s */
  speed?: number,
  children?: string,
}

/**
 * Single-line text that ellipsizes like any other, until it overflows: then it marquees.
 * The cycle's keyframes depend on the measured overflow, so they are computed and handed
 * to the browser as a compositor animation rather than living in the stylesheet.
 */
const MarqueeText = ({ className, style, title, speed = 30, children }: MarqueeTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const [overflowPx, setOverflowPx] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  // Reduced motion keeps the plain ellipsis instead of animating
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  /*
    Measure how far the text overflows its clip. The observer watches both elements, so
    container resizes, font loads, and inline font-size changes all re-measure for free.
  */
  useEffect(() => {
    const container = containerRef.current
    const inner = innerRef.current
    if (!container || !inner) {
      return
    }
    const measure = () => {
      setOverflowPx(Math.max(0, Math.ceil(inner.scrollWidth - container.clientWidth)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [children])

  // Build and run the cycle whenever the text or its overflow changes
  useEffect(() => {
    const container = containerRef.current
    const inner = innerRef.current
    if (!container || !inner || overflowPx === 0 || reducedMotion) {
      return
    }

    const travelMs = (overflowPx / speed) * 1000
    const totalMs = HOLD_START_MS + travelMs + HOLD_END_MS + FADE_MS + FADE_MS
    const at = (ms: number) => ms / totalMs
    const home = 'translateX(0)'
    const away = `translateX(${-overflowPx}px)`

    const travel = inner.animate([
      { offset: 0, transform: home, opacity: 1 },
      { offset: at(HOLD_START_MS), transform: home, opacity: 1 },
      { offset: at(HOLD_START_MS + travelMs), transform: away, opacity: 1 },
      { offset: at(HOLD_START_MS + travelMs + HOLD_END_MS), transform: away, opacity: 1 },
      // Two keyframes on the same offset: fully faded out at the end, then home while still invisible
      { offset: at(HOLD_START_MS + travelMs + HOLD_END_MS + FADE_MS), transform: away, opacity: 0 },
      { offset: at(HOLD_START_MS + travelMs + HOLD_END_MS + FADE_MS), transform: home, opacity: 0 },
      { offset: 1, transform: home, opacity: 1 },
    ], {
      duration: totalMs,
      iterations: Infinity,
    })

    /*
      The edge fade is a mask on the container, so it needs its own animation with the same
      period as the travel; both start in the same frame, so they stay in step forever.
      The duplicate offsets make the swaps instant rather than interpolated.
    */
    const faded = `linear-gradient(to right, #000 calc(100% - ${EDGE_FADE_PX}px), transparent 100%)`
    const edgeFade = container.animate([
      { offset: 0, maskImage: faded, webkitMaskImage: faded },
      { offset: at(HOLD_START_MS + travelMs), maskImage: faded, webkitMaskImage: faded },
      { offset: at(HOLD_START_MS + travelMs), maskImage: 'none', webkitMaskImage: 'none' },
      { offset: at(HOLD_START_MS + travelMs + HOLD_END_MS + FADE_MS), maskImage: 'none', webkitMaskImage: 'none' },
      { offset: at(HOLD_START_MS + travelMs + HOLD_END_MS + FADE_MS), maskImage: faded, webkitMaskImage: faded },
      { offset: 1, maskImage: faded, webkitMaskImage: faded },
    ], {
      duration: totalMs,
      iterations: Infinity,
    })

    return () => {
      travel.cancel()
      edgeFade.cancel()
    }
  }, [children, overflowPx, reducedMotion, speed])

  return (
    <div
      ref={containerRef}
      className={clsx('marquee-text', className, overflowPx > 0 && !reducedMotion && 'is-marqueeing')}
      style={style}
      title={title}
    >
      <span ref={innerRef} className="marquee-text-inner">{children}</span>
    </div>
  )
}

export default MarqueeText
