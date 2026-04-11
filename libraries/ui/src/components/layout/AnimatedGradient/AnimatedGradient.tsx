import { useEffect, useRef, useState } from 'react'

import './AnimatedGradient.css'

type AnimatedGradientProps = {
  values: string[]
  className?: string
  /** Enable autonomous color drift over time. Use the props below to fine-tune the behaviour. */
  dance?: boolean
  /** How strongly the hue reverts toward its original value each step (0–1). Default: 0.3 */
  huePull?: number
  /** Maximum random hue drift per step in degrees (±). Default: 15 */
  hueNoise?: number
  /** How strongly saturation reverts toward its original value each step (0–1). Default: 0.2 */
  satPull?: number
  /** Maximum random saturation drift per step (±%). Default: 8 */
  satNoise?: number
  /** How strongly lightness reverts toward its original value each step (0–1). Default: 0.2 */
  lightPull?: number
  /** Maximum random lightness drift per step (±%). Default: 8 */
  lightNoise?: number
  /** Saturation lower bound (%). Default: 20 */
  satMin?: number
  /** Saturation upper bound (%). Default: 95 */
  satMax?: number
  /** Lightness lower bound (%). Default: 20 */
  lightMin?: number
  /** Lightness upper bound (%). Default: 80 */
  lightMax?: number
  /** Probability (0–1) of a quick burst interval instead of a slow drift. Default: 0.2 */
  burstChance?: number
  /** Minimum quick burst interval in ms. Default: 1000 */
  burstMin?: number
  /** Maximum quick burst interval in ms. Default: 3000 */
  burstMax?: number
  /** Minimum slow drift interval in ms. Default: 5000 */
  driftMin?: number
  /** Maximum slow drift interval in ms. Default: 15000 */
  driftMax?: number
  /** Duration of the blotch transition animation in ms. Default: 800 */
  transitionDuration?: number
}

type Blotch = {
  color: string
  x: number
  y: number
  size: number
}

// ─── Blotch helpers ──────────────────────────────────────────────────────────

function randomBlotches(colors: string[]): Blotch[] {
  return colors.map((color) => ({
    color,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    size: 70 + Math.random() * 50,
  }))
}

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

function buildBackground(blotches: Blotch[]): string {
  const layers = blotches.map(
    ({ color, x, y, size }) =>
      `radial-gradient(ellipse at ${x.toFixed(1)}% ${y.toFixed(1)}%, ${color}, transparent ${size.toFixed(1)}%)`,
  )
  return [...layers, 'var(--bg-1)'].join(', ')
}

// ─── Color interpolation ─────────────────────────────────────────────────────

function lerpColor(a: string, b: string, t: number): string {
  const ca = parseColor(a)
  const cb = parseColor(b)
  if (!ca || !cb) return t < 0.5 ? a : b
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t)
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t)
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t)
  return `rgb(${r},${g},${bl})`
}

function parseColor(color: string): [number, number, number] | null {
  const rgbMatch = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])]
  }
  const hex = color.replace('#', '').slice(0, 6)
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

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// ─── Color drift (HSL) ───────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const raw = hex.replace('#', '').slice(0, 6)
  const r = parseInt(raw.slice(0, 2), 16) / 255
  const g = parseInt(raw.slice(2, 4), 16) / 255
  const b = parseInt(raw.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const s =
    max === min
      ? 0
      : l > 0.5
        ? (max - min) / (2 - max - min)
        : (max - min) / (max + min)
  let h = 0
  if (max !== min) {
    switch (max) {
      case r: h = ((g - b) / (max - min) + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / (max - min) + 2) / 6; break
      case b: h = ((r - g) / (max - min) + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue2rgb = (t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    r = hue2rgb(h + 1 / 3)
    g = hue2rgb(h)
    b = hue2rgb(h - 1 / 3)
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function driftColor(
  hex: string,
  originalHex: string,
  huePull: number,
  hueNoise: number,
  satPull: number,
  satNoise: number,
  lightPull: number,
  lightNoise: number,
  satMin: number,
  satMax: number,
  lightMin: number,
  lightMax: number,
): string {
  const [h, s, l] = hexToHsl(hex)
  const [oh, os, ol] = hexToHsl(originalHex)
  const pull = ((oh - h + 540) % 360) - 180
  const newH = (h + pull * huePull + (Math.random() * 2 - 1) * hueNoise + 360) % 360
  const newS = clamp(s + (os - s) * satPull + (Math.random() * 2 - 1) * satNoise, satMin, satMax)
  const newL = clamp(l + (ol - l) * lightPull + (Math.random() * 2 - 1) * lightNoise, lightMin, lightMax)
  return hslToHex(newH, newS, newL)
}

// ─── Component ───────────────────────────────────────────────────────────────

const AnimatedGradient = ({
  values,
  className,
  dance = false,
  huePull = 0.3,
  hueNoise = 15,
  satPull = 0.2,
  satNoise = 8,
  lightPull = 0.2,
  lightNoise = 8,
  satMin = 20,
  satMax = 95,
  lightMin = 20,
  lightMax = 80,
  burstChance = 0.2,
  burstMin = 1000,
  burstMax = 3000,
  driftMin = 5000,
  driftMax = 15000,
  transitionDuration = 800,
}: AnimatedGradientProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const fromRef = useRef<Blotch[]>(randomBlotches(values))
  const toRef = useRef<Blotch[]>(randomBlotches(values))
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  const originalColorsRef = useRef<string[]>(values)
  const [activeValues, setActiveValues] = useState<string[]>(values)

  // Keep anchor colors in sync when `values` changes externally.
  useEffect(() => {
    originalColorsRef.current = values
    if (!dance) setActiveValues(values)
  }, [values])

  // Autonomous drift timer.
  useEffect(() => {
    if (!dance) return
    const timer = { id: 0 }

    const scheduleNext = () => {
      const delay =
        Math.random() < burstChance
          ? burstMin + Math.random() * (burstMax - burstMin)
          : driftMin + Math.random() * (driftMax - driftMin)

      timer.id = window.setTimeout(() => {
        setActiveValues((prev) =>
          prev.map((color, i) =>
            driftColor(
              color,
              originalColorsRef.current[i] ?? color,
              huePull, hueNoise,
              satPull, satNoise,
              lightPull, lightNoise,
              satMin, satMax,
              lightMin, lightMax,
            ),
          ),
        )
        scheduleNext()
      }, delay)
    }

    scheduleNext()
    return () => clearTimeout(timer.id)
  }, [dance])

  // Animation loop — reruns whenever the displayed colors change.
  const displayValues = dance ? activeValues : values

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const newTarget = randomBlotches(displayValues)
    const currentBlotches = (() => {
      if (startRef.current === null) return fromRef.current
      const elapsed = performance.now() - startRef.current
      const t = Math.min(elapsed / transitionDuration, 1)
      return lerpBlotches(fromRef.current, toRef.current, easeInOut(t))
    })()

    fromRef.current = currentBlotches
    toRef.current = newTarget

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    startRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startRef.current!
      const t = Math.min(elapsed / transitionDuration, 1)
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
  }, [displayValues])

  // When tabbing back, rAF resumes with the real current timestamp while
  // startRef holds a stale pre-hide timestamp, making elapsed huge and t=1.
  // Reset the start time so the transition replays cleanly, and force a
  // repaint of the last known state in case nothing was animating.
  useEffect(() => {
    const el = ref.current

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return

      if (startRef.current !== null) {
        // Animation was in progress — reset start so it replays from t=0.
        startRef.current = performance.now()
      } else if (el) {
        // No animation running — repaint the last committed state.
        el.style.background = buildBackground(fromRef.current)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return (
    <div
      ref={ref}
      className={['animated-gradient', className].filter(Boolean).join(' ')}
      style={{ background: buildBackground(toRef.current) }}
    />
  )
}

export default AnimatedGradient
