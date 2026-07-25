import { useEffect, useMemo, useState } from 'react'

import homeServerAPI from '../lib/homeserver/homeServerAPI'
import queryParams from '../lib/net/queryParams'
import { sampleImageColors } from '../lib/color/sampleImageColors'
import type { ReleaseCoverSize } from './useReleaseCover'

/* Sleeve art is often mostly white or mostly black, so the single most dominant color comes
   back as a near-neutral that no two covers can be told apart by. Sampling a few and keeping
   the liveliest gives every release a color of its own. */
const CANDIDATES_PER_COVER = 3

const vividness = (hex: string): number => {
  const value = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((part) => part / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2

  return (max - min) + 0.3 * (1 - Math.abs(lightness - 0.5) * 2)
}

const pickVivid = (colors: string[]): string | null => (
  colors.length
    ? colors.reduce((best, color) => vividness(color) > vividness(best) ? color : best)
    : null
)

export type ReleaseCover = {
  /** Blob URL of the cover itself. */
  src: string
  /** The liveliest of several colors sampled from it. */
  color: string | null
}

/**
 * Loads a cover per release, keyed by release id, along with one color sampled
 * from each.
 *
 * Where useReleasesCoverColors spreads a small palette across a discography,
 * this gives every release its own cover and color, for visuals that draw one
 * band or marker per release. Releases whose cover can't be loaded are left out
 * of the map rather than given a placeholder.
 */
export function useReleaseCovers(
  releaseIds: string[],
  size: ReleaseCoverSize = 'small_nocrop',
): Record<string, ReleaseCover> {
  const [covers, setCovers] = useState<Record<string, ReleaseCover>>({})

  // Re-load only when the set of releases actually changes, not on every render
  const releaseKey = releaseIds.join(',')
  const ids = useMemo(() => releaseIds, [releaseKey])

  useEffect(() => {
    if (!ids.length) {
      setCovers({})
      return
    }

    let stale = false

    Promise.all(ids.map(async (releaseId): Promise<[string, ReleaseCover | null]> => {
      try {
        const { blobUrl } = await homeServerAPI<{ blobUrl: string }>(
          queryParams(`/music/releases/${releaseId}/cover`, { size }),
          'GET',
          { blob: true },
        )
        const sampled = await sampleImageColors(blobUrl, CANDIDATES_PER_COVER)
        return [releaseId, { src: blobUrl, color: pickVivid(sampled) }]
      } catch {
        return [releaseId, null]
      }
    }))
      .then((loaded) => {
        if (!stale) {
          setCovers(Object.fromEntries(loaded.filter(([, cover]) => !!cover)))
        }
      })

    return () => {
      stale = true
    }
  }, [ids, size])

  return covers
}
