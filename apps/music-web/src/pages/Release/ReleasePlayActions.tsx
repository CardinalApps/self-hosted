import { useMemo } from 'react'

import Button from '@cardinalapps/ui/src/components/interaction/Button'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { useVisiblePlayer } from '@cardinalapps/ui/src/hooks/useVisiblePlayer'
import { audioSelectors } from '@cardinalapps/ui/src/store/slices/music'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import play from '@cardinalapps/ui/src/store/slices/music/thunks/play'
import { MusicTrackType } from '@cardinalapps/ui/src/store/apis/musicTracks'
import { useGetMusicHistoryQuery } from '@cardinalapps/ui/src/store/apis/musicHistory'
import { useExtendQueueMutation } from '@cardinalapps/ui/src/store/apis/playbackQueues'
import { isFavorite } from '@cardinalapps/ui/src/lib/media/ratings'

import DynamicQueueActionButton from '../../components/DynamicQueueActionButton'

import i18n from './i18n.json'

// History entries report progress as a 0-1 ratio; at this point a track counts as heard
const FINISHED_PROGRESS_RATIO = 0.9
const HISTORY_LOOKBACK = 100

type ReleasePlayActionsProps = {
  releaseId: string,
  orderedTracks: MusicTrackType[],
}

// The public track ID used for playback
const trackId = (track: MusicTrackType) => track?.musicTrackId ?? String(track?.id ?? '')

// Fisher-Yates
const shuffle = (ids: string[]) => {
  const shuffled = [...ids]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * The stack of "play this album" buttons: the House Mix and Encore action buttons on
 * top, and a grid of one-press playback modes under them. Every mode can also feed the
 * current queue instead of starting fresh, via its choices.
 */
function ReleasePlayActions({
  releaseId,
  orderedTracks,
}: ReleasePlayActionsProps) {
  const dispatch = useAppDispatch()
  const { lang } = useAppSelector(settingsSelectors.current)
  const players = useAppSelector(audioSelectors.players)
  const [visiblePlayer] = useVisiblePlayer()
  const [extendQueue] = useExtendQueueMutation()
  const { data: historyData } = useGetMusicHistoryQuery({
    take: HISTORY_LOOKBACK,
    order: 'DESC',
    release: true,
    metadata: true,
  })

  const orderedIds = orderedTracks.map(trackId)
  const favoriteIds = orderedTracks.filter((track) => isFavorite(track?.rating)).map(trackId)
  const unheardIds = orderedTracks.filter((track) => !Number(track?.playCount)).map(trackId)
  const topTrackIds = [...orderedTracks]
    .sort((a, b) => (
      (Number(b?.playCount) || 0) - (Number(a?.playCount) || 0)
      || (Number(b?.rating) || 0) - (Number(a?.rating) || 0)
    ))
    .map(trackId)

  /*
    Resume plays this release from wherever the user's history left off: everything from
    the most recently played track onward, or from the following track when that one was
    already mostly finished. Empty (button disabled) when this release has no recent
    history or the album was heard to the end.
  */
  const resumeIds = useMemo(() => {
    const entries = historyData?.[0] || []
    const lastEntry = entries.find((entry) => entry?.track?.release?.musicReleaseId === releaseId)
    if (!lastEntry) return []

    const lastPlayedId = lastEntry.track?.musicTrackId
    const lastIndex = orderedTracks.findIndex((track) => trackId(track) === lastPlayedId)
    if (lastIndex === -1) return []

    const finished = Number(lastEntry.progress) >= FINISHED_PROGRESS_RATIO
    const startIndex = finished ? lastIndex + 1 : lastIndex
    return startIndex < orderedTracks.length
      ? orderedTracks.slice(startIndex).map(trackId)
      : []
  }, [historyData, orderedTracks, releaseId])

  const modes = [
    {
      key: 'play',
      label: i18n['music-release.play-actions.play'][lang],
      icon: 'fas fa-play',
      ids: orderedIds,
      getIds: () => orderedIds,
    },
    {
      key: 'shuffle',
      label: i18n['music-release.play-actions.shuffle'][lang],
      icon: 'fas fa-random',
      ids: orderedIds,
      getIds: () => shuffle(orderedIds),
    },
    {
      key: 'favorites',
      label: i18n['music-release.play-actions.favorites'][lang],
      icon: 'fas fa-star',
      ids: favoriteIds,
      getIds: () => favoriteIds,
    },
    {
      key: 'unheard',
      label: i18n['music-release.play-actions.unheard'][lang],
      icon: 'fas fa-seedling',
      ids: unheardIds,
      getIds: () => unheardIds,
    },
    {
      key: 'top-tracks',
      label: i18n['music-release.play-actions.top-tracks'][lang],
      icon: 'fas fa-trophy',
      ids: topTrackIds,
      getIds: () => topTrackIds,
    },
    {
      key: 'resume',
      label: i18n['music-release.play-actions.resume'][lang],
      icon: 'fas fa-history',
      ids: resumeIds,
      getIds: () => resumeIds,
    },
  ]

  const handlePlay = (getIds: () => string[]) => {
    const ids = getIds()
    if (ids.length) {
      dispatch(play({ trackIds: ids }))
    }
  }

  /*
    The queue verbs target the queue behind the visible player. With nothing playing they
    fall back to starting playback, which is what "play next" means on an idle app anyway.
  */
  const handleQueueChoice = (getIds: () => string[], insert: 'next' | 'end') => {
    const ids = getIds()
    if (!ids.length) return

    const activeQueueId = visiblePlayer ? players?.[visiblePlayer]?.queue?.queueId : undefined
    if (activeQueueId) {
      extendQueue({ queueId: activeQueueId, trackIds: ids, insert })
    } else {
      dispatch(play({ trackIds: ids }))
    }
  }

  return (
    <div className="release-play-actions">
      <div className="release-mix-row">
        <DynamicQueueActionButton
          seedMediaType="music_release"
          seedMediaId={releaseId}
          dynamicQueueType="house_mix"
          icon="fas fa-dna"
          label={i18n['music-release.play-actions.house-mix'][lang]}
        />
        <DynamicQueueActionButton
          seedMediaType="music_release"
          seedMediaId={releaseId}
          dynamicQueueType="encore"
          icon="fas fa-theater-masks"
          label={i18n['music-release.play-actions.encore'][lang]}
        />
      </div>
      <div className="release-play-modes">
        {modes.map((mode) => (
          <Button
            key={mode.key}
            icon={mode.icon}
            disabled={!mode.ids.length}
            onClick={() => handlePlay(mode.getIds)}
            choices={[
              {
                label: i18n['music-release.play-actions.play-next'][lang],
                icon: 'fas fa-step-forward',
                onSelect: () => handleQueueChoice(mode.getIds, 'next'),
              },
              {
                label: i18n['music-release.play-actions.add-to-queue'][lang],
                icon: 'fas fa-plus',
                onSelect: () => handleQueueChoice(mode.getIds, 'end'),
              },
            ]}
          >
            {mode.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

export default ReleasePlayActions
