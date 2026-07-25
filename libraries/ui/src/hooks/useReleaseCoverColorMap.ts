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

/**
 * Samples one dominant color per release cover, keyed by release id.
 *
 * Where useReleasesCoverColors spreads a small palette across a discography,
 * this gives every release a color of its own, for visuals that draw one band
 * or marker per release. Releases whose cover can't be read are left out of the
 * map rather than given a placeholder color.
 */
export function useReleaseCoverColorMap(
  releaseIds: string[],
  size: ReleaseCoverSize = 'small_nocrop',
): Record<string, string> {
  const [colors, setColors] = useState<Record<string, string>>({})

  // Re-sample only when the set of releases actually changes, not on every render
  const releaseKey = releaseIds.join(',')
  const ids = useMemo(() => releaseIds, [releaseKey])

  useEffect(() => {
    if (!ids.length) {
      setColors({})
      return
    }

    let stale = false

    Promise.all(ids.map(async (releaseId): Promise<[string, string | null]> => {
      try {
        const { blobUrl } = await homeServerAPI<{ blobUrl: string }>(
          queryParams(`/music/releases/${releaseId}/cover`, { size }),
          'GET',
          { blob: true },
        )
        const sampled = await sampleImageColors(blobUrl, CANDIDATES_PER_COVER)
        return [releaseId, pickVivid(sampled)]
      } catch {
        return [releaseId, null]
      }
    }))
      .then((sampled) => {
        if (!stale) {
          setColors(Object.fromEntries(sampled.filter(([, color]) => !!color)))
        }
      })

    return () => {
      stale = true
    }
  }, [ids, size])

  return colors
}
