import { useMemo } from 'react'

import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { librarySelectors } from '@cardinalapps/ui/src/store/slices/library'
import { useGetMusicTracksQuery } from '@cardinalapps/ui/src/store/apis/musicTracks'

// Must match the server's fresh queue window
const FRESH_WINDOW_DAYS = 365

/**
 * Whether the active libraries contain any music released in real life within
 * the fresh window. Both fresh action buttons share this probe, and RTK
 * deduplicates it into a single request.
 */
export function useHasFreshMusic(): boolean {
  const libraries = useAppSelector(librarySelectors.current)

  const releasedSince = useMemo(() => {
    return new Date(Date.now() - FRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  }, [])

  const { data, isSuccess } = useGetMusicTracksQuery({
    take: 1,
    releasedSince,
    ...(libraries?.length ? { libraries } : {}),
  })

  const freshTracks = Array.isArray(data) ? data[0] : []
  return isSuccess && !!freshTracks.length
}
