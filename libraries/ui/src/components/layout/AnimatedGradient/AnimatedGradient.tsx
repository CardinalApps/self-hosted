import { useEffect, useRef } from 'react'

import './AnimatedGradient.css'

type AnimatedGradientProps = {
  values: string[]
  className?: string
}

type Blotch = {
  color: string
  x: number
  y: number
  size: number
}

/**
 * Creates a blotch for each color with randomized position and size.
 */
function randomBlotches(colors: string[]): Blotch[] {
  return colors.map((color) => ({
    color,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    size: 70 + Math.random() * 50,
  }))
}

/**
 * Interpolates position, size, and color of each blotch between two states at
 * progress t.
 */
function lerpBlotches(from: Blotch[], to: Blotch[], t: number): Blotch[] {
  const count = Math.max(from.length, to.length)
  return Array.from({ length: count }, (_, i) => {
    const a = from[i] ?? to[i]
    const b = to[i] ?? from[i]
    return {
      color: lerpColor(a.color, b.color, t),
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      size: a.size + (b.size - a.size) * t,
    }
  })
}

/**
 * Builds the CSS background value from a list of blotches, falling back to --bg-1.
 */
function buildBackground(blotches: Blotch[]): string {
  const layers = blotches.map(
    ({ color, x, y, size }) =>
      `radial-gradient(ellipse at ${x.toFixed(1)}% ${y.toFixed(1)}%, ${color}, transparent ${size.toFixed(1)}%)`,
  )
  return [...layers, 'var(--bg-1)'].join(', ')
}

/**
 * Interpolates between two hex colors, returning an rgb() string.
 */
function lerpColor(a: string, b: string, t: number): string {
  const ca = parseColor(a)
  const cb = parseColor(b)
  if (!ca || !cb) return t < 0.5 ? a : b
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t)
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t)
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t)
  return `rgb(${r},${g},${bl})`
}

/**
 * Parses a 3- or 6-digit hex color into an [r, g, b] tuple.
 */
function parseColor(color: string): [number, number, number] | null {
  const hex = color.replace('#', '')
  if (hex.length === 6) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]
  }
  if (hex.length === 3) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ]
  }
  return null
}

/**
 * Quadratic ease-in-out curve: slow start, fast middle, slow end.
 */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

const DURATION = 800

const AnimatedGradient = ({ values, className }: AnimatedGradientProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const fromRef = useRef<Blotch[]>(randomBlotches(values))
  const toRef = useRef<Blotch[]>(randomBlotches(values))
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const newTarget = randomBlotches(values)
    const currentBlotches = (() => {
      if (startRef.current === null) return fromRef.current
      const elapsed = performance.now() - startRef.current
      const t = Math.min(elapsed / DURATION, 1)
      return lerpBlotches(fromRef.current, toRef.current, easeInOut(t))
    })()

    fromRef.current = currentBlotches
    toRef.current = newTarget

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    startRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startRef.current!
      const t = Math.min(elapsed / DURATION, 1)
      const blotches = lerpBlotches(fromRef.current, toRef.current, easeInOut(t))
      el.style.background = buildBackground(blotches)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        rafRef.current = null
        startRef.current = null
        fromRef.current = toRef.current
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [values])

  return (
    <div
      ref={ref}
      className={['animated-gradient', className].filter(Boolean).join(' ')}
      style={{ background: buildBackground(toRef.current) }}
    />
  )
}

export default AnimatedGradient
