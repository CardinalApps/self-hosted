export type ParsedCssColor = {
  hex: string,
  alpha: number,
}

const HEX_PATTERN = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const RGB_PATTERN = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i

// Converts a 0-255 channel to a two-character hex pair
const toHexPair = (channel: number): string => channel.toString(16).padStart(2, '0')

/**
 * Parses a CSS color string (#rgb, #rrggbb, #rrggbbaa, rgb(), rgba()) into a
 * lowercase 6-digit hex and an alpha in [0, 1]. Returns null for anything it
 * can't parse (named colors, hsl(), var() references, etc).
 */
export function parseCssColor(color: string): ParsedCssColor | null {
  const input = color?.trim().toLowerCase()
  if (!input) {
    return null
  }

  const hexMatch = input.match(HEX_PATTERN)
  if (hexMatch) {
    let digits = hexMatch[1]
    if (digits.length <= 4) {
      digits = digits.split('').map((digit) => digit + digit).join('')
    }
    const alpha = digits.length === 8
      ? parseInt(digits.slice(6, 8), 16) / 255
      : 1
    return { hex: `#${digits.slice(0, 6)}`, alpha: Math.round(alpha * 100) / 100 }
  }

  const rgbMatch = input.match(RGB_PATTERN)
  if (rgbMatch) {
    const [r, g, b] = [rgbMatch[1], rgbMatch[2], rgbMatch[3]].map((channel) => Math.min(255, parseInt(channel, 10)))
    let alpha = 1
    if (rgbMatch[4]) {
      alpha = rgbMatch[4].endsWith('%')
        ? parseFloat(rgbMatch[4]) / 100
        : parseFloat(rgbMatch[4])
      alpha = Math.min(1, Math.max(0, alpha))
    }
    return { hex: `#${toHexPair(r)}${toHexPair(g)}${toHexPair(b)}`, alpha }
  }

  return null
}

/**
 * Serializes a hex + alpha pair back to a CSS color string: the hex itself
 * when fully opaque, rgba() otherwise.
 */
export function serializeCssColor(hex: string, alpha: number): string {
  if (alpha >= 1) {
    return hex
  }

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
