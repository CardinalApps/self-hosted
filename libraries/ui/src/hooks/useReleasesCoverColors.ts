import { useEffect, useMemo, useState } from 'react'

import { sampleImageColors } from '../lib/color/sampleImageColors'
import type { ReleaseCover } from './useReleaseCovers'

const NUM_BLOTCHES = 3

type SamplePlan = {
  releaseId: string
  numColors: number
}

const shuffle = <T>(items: T[]): T[] => {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Decides which releases to sample and how many colors to take from each.
 *
 * The aim is to sample as wide as the discography allows: with enough releases
 * every color comes from a different one, and only when there aren't enough do
 * releases start contributing a second or third color. Which release gets the
 * extras is random, so two visits to a two-release artist don't always lean the
 * same way.
 */
export function planCoverSamples(releaseIds: string[], numColors: number): SamplePlan[] {
  if (!releaseIds.length || numColors < 1) {
    return []
  }

  const shuffled = shuffle(releaseIds)

  if (shuffled.length >= numColors) {
    return shuffled.slice(0, numColors).map((releaseId) => ({ releaseId, numColors: 1 }))
  }

  const plan: SamplePlan[] = shuffled.map((releaseId) => ({ releaseId, numColors: 1 }))
  const handoutOrder = shuffle(plan.map((_, index) => index))

  let remaining = numColors - plan.length
  for (let i = 0; remaining > 0; i++, remaining--) {
    plan[handoutOrder[i % handoutOrder.length]].numColors++
  }

  return plan
}

/**
 * Samples a palette across several already-loaded release covers at once, for
 * backgrounds that should represent a whole discography rather than one album.
 *
 * Pass the map that useReleaseCovers returns; the sampling reuses those blob
 * URLs rather than fetching anything of its own. The picks are re-rolled
 * whenever the set of covers changes, so each visit to a page gets a different
 * cut of a large discography.
 */
export function useReleasesCoverColors(
  covers: Record<string, ReleaseCover>,
  numColors: number = NUM_BLOTCHES,
): string[] {
  const [colors, setColors] = useState<string[]>([])

  // Re-roll only when the set of covers actually changes, not on every render
  const coverKey = Object.keys(covers).join(',')
  const plan = useMemo(() => planCoverSamples(Object.keys(covers), numColors), [coverKey, numColors])

  useEffect(() => {
    if (!plan.length) {
      setColors([])
      return
    }

    let stale = false

    Promise.all(plan.map(async (entry) => {
      try {
        return await sampleImageColors(covers[entry.releaseId].src, entry.numColors)
      } catch {
        // A cover that can't be read simply contributes nothing
        return []
      }
    }))
      .then((sampled) => {
        if (!stale) {
          setColors(sampled.flat())
        }
      })

    return () => {
      stale = true
    }
  }, [plan])

  return colors
}
