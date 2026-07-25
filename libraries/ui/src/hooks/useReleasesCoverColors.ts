import { useEffect, useMemo, useState } from 'react'

import homeServerAPI from '../lib/homeserver/homeServerAPI'
import queryParams from '../lib/net/queryParams'
import { sampleImageColors } from '../lib/color/sampleImageColors'
import type { ReleaseCoverSize } from './useReleaseCover'

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
 * Samples a palette across several release covers at once, for backgrounds that
 * should represent a whole discography rather than one album.
 *
 * Pass only releases that actually have artwork. The picks are re-rolled
 * whenever the release list changes, so each visit to a page gets a different
 * cut of a large discography.
 */
export function useReleasesCoverColors(
  releaseIds: string[],
  numColors: number = NUM_BLOTCHES,
  size: ReleaseCoverSize = 'small_nocrop',
): string[] {
  const [colors, setColors] = useState<string[]>([])

  // Re-roll only when the set of releases actually changes, not on every render
  const releaseKey = releaseIds.join(',')
  const plan = useMemo(() => planCoverSamples(releaseIds, numColors), [releaseKey, numColors])

  useEffect(() => {
    if (!plan.length) {
      setColors([])
      return
    }

    let stale = false

    Promise.all(plan.map(async (entry) => {
      try {
        const { blobUrl } = await homeServerAPI<{ blobUrl: string }>(
          queryParams(`/music/releases/${entry.releaseId}/cover`, { size }),
          'GET',
          { blob: true },
        )
        return await sampleImageColors(blobUrl, entry.numColors)
      } catch {
        // A release whose cover can't be read simply contributes nothing
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
  }, [plan, size])

  return colors
}
