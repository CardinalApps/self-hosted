import { useState, useEffect } from 'react'

// Downscale the image to this size before sampling to reduce noise
const SAMPLE_SIZE = 12
const NUM_BLOTCHES = 3
const SATURATION_BOOST = 1.5

/**
 * Returns 4 dominant hex colors extracted from an image blob URL.
 */
export function useCoverColors(coverSrc: string | null | undefined): string[] {
  const [colors, setColors] = useState<string[]>([])

  useEffect(() => {
    if (!coverSrc) {
      setColors([])
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = SAMPLE_SIZE
      canvas.height = SAMPLE_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
      const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

      // Collect all opaque pixels as [r, g, b]
      const pixels: [number, number, number][] = []
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 128) {
          pixels.push([data[i], data[i + 1], data[i + 2]])
        }
      }

      setColors(pickDominant(pixels, NUM_BLOTCHES))
    }

    img.src = coverSrc
  }, [coverSrc])

  return colors
}

/**
 * Picks n dominant colors by k-means clustering.
 */
function pickDominant(pixels: [number, number, number][], n: number): string[] {
  if (pixels.length === 0) return []

  // Seed centroids evenly from the pixel list
  let centroids = pixels.filter((_, i) => i % Math.floor(pixels.length / n) === 0).slice(0, n)
  while (centroids.length < n) centroids.push(pixels[0])

  for (let iter = 0; iter < 10; iter++) {
    const buckets: [number, number, number][][] = Array.from({ length: n }, () => [])

    for (const px of pixels) {
      let best = 0
      let bestDist = Infinity
      for (let i = 0; i < centroids.length; i++) {
        const d = colorDist(px, centroids[i])
        if (d < bestDist) { bestDist = d; best = i }
      }
      buckets[best].push(px)
    }

    centroids = centroids.map((c, i) => {
      const bucket = buckets[i]
      if (bucket.length === 0) return c
      const sum = bucket.reduce((acc, px) => [acc[0] + px[0], acc[1] + px[1], acc[2] + px[2]])
      return [Math.round(sum[0] / bucket.length), Math.round(sum[1] / bucket.length), Math.round(sum[2] / bucket.length)]
    })
  }

  return centroids.map((c) => toHex(boostSaturation(c, SATURATION_BOOST)))
}

function colorDist(a: [number, number, number], b: [number, number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

// Converts RGB to HSL (h: 0-360, s: 0-1, l: 0-1) to support saturation boosting
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [h * 60, s, l]
}

// Converts HSL back to an RGB tuple
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60)       { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else              { r = c; b = x }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

// Boosts saturation of an RGB color by a multiplier, clamped to [0, 1]
function boostSaturation(rgb: [number, number, number], amount: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(...rgb)
  return hslToRgb(h, Math.min(s * amount, 1), l)
}
