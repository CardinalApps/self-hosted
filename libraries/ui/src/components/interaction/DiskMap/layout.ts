export type DiskMapBlock = {
  /** Unique id for the block, eg. a track id. */
  id: string
  /** Blocks sharing a groupId are drawn as one contiguous, single-colored band. */
  groupId: string
  /** Size on disk. Decides how much of the map's area the block claims. */
  bytes: number
  label?: string
  groupLabel?: string
  /** Free-form facts for the tooltip's tag row, eg. ["05:48", "FLAC 16-bit/44.1 kHz"]. */
  details?: string[]
  /** Draws a texture over the block, to mark lossless rips apart from lossy ones. */
  lossless?: boolean
}

/**
 * One block's box, as fractions of the map from its top left corner. Fractions
 * rather than pixels so that the same layout survives the map being resized.
 */
export type DiskMapRect = {
  blockIndex: number
  x: number
  y: number
  width: number
  height: number
}

export type DiskMapFrame = {
  width: number
  height: number
  /** The smallest a block may get on either side before it stops reading as a block. */
  minBlockPx?: number
}

/*
  Blocks are laid out in strips: each strip spans the full width, and its height falls out of
  the areas of the blocks in it. A strip closes as soon as adding another block would make its
  worst box less square, which is what keeps most slivers from forming in the first place.
*/
const worstAspect = (areas: number[], from: number, to: number, height: number): number => {
  let worst = 1

  for (let i = from; i <= to; i++) {
    const width = areas[i] / height
    const ratio = width > height ? width / height : height / width
    if (ratio > worst) worst = ratio
  }

  return worst
}

/**
 * Raises every value to at least `minimum` without changing their total.
 * Values that would have fallen short are pinned at the floor and the rest give
 * up their share in proportion to their size, repeated until nothing new falls
 * through. Used for both block areas and, within a strip, block widths.
 */
const distributeMinimum = (values: number[], minimum: number, total: number): number[] => {
  if (minimum <= 0 || !values.length) {
    return values
  }

  const floor = Math.min(minimum, total / values.length)
  const pinned = new Array(values.length).fill(false)
  let result = [...values]

  for (let pass = 0; pass < 8; pass++) {
    const pinnedTotal = pinned.reduce((sum, isPinned) => isPinned ? sum + floor : sum, 0)
    const freeWeight = values.reduce((sum, value, index) => pinned[index] ? sum : sum + value, 0)

    if (freeWeight <= 0) break

    const scale = (total - pinnedTotal) / freeWeight
    let changed = false

    result = values.map((value, index) => {
      if (pinned[index]) return floor

      const scaled = value * scale

      if (scaled < floor) {
        pinned[index] = true
        changed = true
        return floor
      }

      return scaled
    })

    if (!changed) break
  }

  return result
}

/**
 * Packs every block into a fixed frame, giving each one an area proportional to
 * its size on disk, in the order they were handed over.
 *
 * The frame never changes shape or grows: an artist with 1,200 tracks gets 1,200
 * smaller boxes rather than a taller map. Because the result is expressed as
 * fractions of the frame, it survives the frame being resized without re-packing.
 */
export function layoutDiskMap(blocks: DiskMapBlock[], frame: DiskMapFrame): DiskMapRect[] {
  const { width, height, minBlockPx = 0 } = frame

  if (!blocks.length || !(width > 0) || !(height > 0)) {
    return []
  }

  const total = width * height
  const weights = blocks.map((block) => Math.max(0, block.bytes || 0))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  // With no size information there is nothing to be proportional to, so every block is equal
  const shares = totalWeight > 0
    ? weights.map((weight) => (weight / totalWeight) * total)
    : weights.map(() => total / blocks.length)

  const areas = distributeMinimum(shares, minBlockPx * minBlockPx, total)

  const rects: DiskMapRect[] = []
  let y = 0
  let index = 0

  while (index < blocks.length) {
    let strip = 0
    let bestAspect = Infinity
    let count = 0
    let stripArea = 0

    for (let end = index; end < blocks.length; end++) {
      strip += areas[end]
      const aspect = worstAspect(areas, index, end, strip / width)

      if (aspect > bestAspect) break

      bestAspect = aspect
      count = end - index + 1
      stripArea = strip
    }

    const stripHeight = stripArea / width

    /* A small block sharing a strip with much larger ones still comes out as a sliver, since
       every box in a strip is the same height. The narrow ones take their minimum from the
       wide ones, which keeps the strip exactly full and the areas near enough true. */
    const widths = distributeMinimum(
      areas.slice(index, index + count).map((area) => area / stripHeight),
      minBlockPx,
      width,
    )

    let x = 0

    widths.forEach((blockWidth, offset) => {
      rects.push({
        blockIndex: index + offset,
        x: x / width,
        y: y / height,
        width: blockWidth / width,
        height: stripHeight / height,
      })

      x += blockWidth
    })

    y += stripHeight
    index += count
  }

  return rects
}

/**
 * Maps each groupId to a color, by the order the groups first appear. Palettes
 * shorter than the number of groups repeat.
 */
export function buildGroupColors(blocks: DiskMapBlock[], palette: string[]): Map<string, string> {
  const colors = new Map<string, string>()

  if (!palette.length) {
    return colors
  }

  for (const block of blocks) {
    if (!colors.has(block.groupId)) {
      colors.set(block.groupId, palette[colors.size % palette.length])
    }
  }

  return colors
}

/**
 * Formats a byte count the way a file manager would.
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) {
    return '0 MB'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const magnitude = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, magnitude)

  return `${value >= 100 || magnitude === 0 ? Math.round(value) : value.toFixed(1)} ${units[magnitude]}`
}
