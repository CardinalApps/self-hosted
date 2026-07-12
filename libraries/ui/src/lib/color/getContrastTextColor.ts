// Alpha of the translucent white ".glass" overlay rendered on top of the cover-derived gradient
const GLASS_OVERLAY_ALPHA = 0.2
const BRIGHTNESS_THRESHOLD = 128

/**
 * Given the dominant colors of a glass surface's background, returns whether
 * light or dark text/icons will read clearly on top of it.
 */
export function getContrastTextColor(colors: string[]): 'light' | 'dark' {
  if (colors.length === 0) return 'dark'

  const rgbs = colors.map(hexToRgb)
  const avg = rgbs.reduce((acc, rgb) => [acc[0] + rgb[0], acc[1] + rgb[1], acc[2] + rgb[2]], [0, 0, 0])
    .map((sum) => sum / rgbs.length) as [number, number, number]

  const blended = avg.map((channel) => channel * (1 - GLASS_OVERLAY_ALPHA) + 255 * GLASS_OVERLAY_ALPHA)
  const brightness = (blended[0] * 299 + blended[1] * 587 + blended[2] * 114) / 1000

  return brightness < BRIGHTNESS_THRESHOLD ? 'light' : 'dark'
}

function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace('#', '')
  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  ]
}
