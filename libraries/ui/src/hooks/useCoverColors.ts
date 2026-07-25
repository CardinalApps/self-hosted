import { useState, useEffect } from 'react'

import { sampleImageColors } from '../lib/color/sampleImageColors'

const NUM_BLOTCHES = 3

/**
 * Returns `numColors` dominant hex colors extracted from an image blob URL.
 */
export function useCoverColors(coverSrc: string | null | undefined, numColors: number = NUM_BLOTCHES): string[] {
  const [colors, setColors] = useState<string[]>([])

  useEffect(() => {
    if (!coverSrc) {
      setColors([])
      return
    }

    let stale = false

    sampleImageColors(coverSrc, numColors).then((sampled) => {
      if (!stale) {
        setColors(sampled)
      }
    })

    return () => {
      stale = true
    }
  }, [coverSrc, numColors])

  return colors
}
