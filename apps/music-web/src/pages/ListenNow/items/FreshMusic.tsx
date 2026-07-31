import { useMemo } from 'react'

import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { librarySelectors } from '@cardinalapps/ui/src/store/slices/library'
import { useGetMusicTracksQuery } from '@cardinalapps/ui/src/store/apis/musicTracks'

import i18n from '../i18n.json'
import DynamicQueueActionButton from '../../../components/DynamicQueueActionButton'

// Must match the server's fresh queue window
const FRESH_WINDOW_DAYS = 365

/**
 * Starts a queue of music released in real life within the fresh window,
 * according to the files' metadata. Disabled when the library has none.
 */
function FreshMusic() {
  const { lang } = useAppSelector(settingsSelectors.current)
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
  const hasFreshMusic = isSuccess && !!freshTracks.length

  return (
    <DynamicQueueActionButton
      dynamicQueueType="fresh_music"
      icon="fas fa-seedling"
      disabled={!hasFreshMusic}
      label={i18n['action-buttons.fresh-music'][lang]}
    />
  )
}

export default FreshMusic
