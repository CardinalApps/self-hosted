import { useSelector } from 'react-redux'

import Button from '@cardinalapps/ui/src/components/interaction/Button'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { useVisiblePlayer } from '@cardinalapps/ui/src/hooks/useVisiblePlayer'
import { audioSelectors } from '@cardinalapps/ui/src/store/slices/music'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import play from '@cardinalapps/ui/src/store/slices/music/thunks/play'
import { useExtendQueueMutation } from '@cardinalapps/ui/src/store/apis/playbackQueues'

import MixButton from '../../components/MixButton'

import { discographyTrackIds, discographyTracks, type DiscographyEntry } from './discography'

import i18n from './i18n.json'

type ArtistPlayActionsProps = {
  artistId: string,
  /** Newest release first, which is the order the Play button uses. */
  discography: DiscographyEntry[],
}

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
 * The artist's play buttons: two server-driven mixes on top, then the one-press
 * modes that build a queue out of the discography client-side. Every mode can
 * also feed the current queue instead of starting fresh, via its choices.
 */
function ArtistPlayActions({
  artistId,
  discography,
}: ArtistPlayActionsProps) {
  const dispatch = useAppDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const players = useAppSelector(audioSelectors.players)
  const [visiblePlayer] = useVisiblePlayer()
  const [extendQueue] = useExtendQueueMutation()

  const t = (key: keyof typeof i18n) => i18n[key][lang]

  const newestFirstIds = discographyTrackIds(discography)
  const oldestFirstIds = discographyTrackIds([...discography].reverse())
  const tracks = discographyTracks(discography)

  const favoriteIds = tracks.filter((track) => Number(track?.rating) > 0).map((track) => track.musicTrackId)
  const unheardIds = tracks.filter((track) => !Number(track?.playCount)).map((track) => track.musicTrackId)
  const topTrackIds = [...tracks]
    .sort((a, b) => (
      (Number(b?.playCount) || 0) - (Number(a?.playCount) || 0)
      || (Number(b?.rating) || 0) - (Number(a?.rating) || 0)
    ))
    .filter((track) => Number(track?.playCount) > 0)
    .map((track) => track.musicTrackId)

  const modes = [
    {
      key: 'play',
      label: t('music-artist.play-actions.play'),
      icon: 'fas fa-play',
      ids: newestFirstIds,
      getIds: () => newestFirstIds,
    },
    {
      key: 'chronology',
      label: t('music-artist.play-actions.chronology'),
      icon: 'fas fa-hourglass-half',
      ids: oldestFirstIds,
      getIds: () => oldestFirstIds,
    },
    {
      key: 'true-shuffle',
      label: t('music-artist.play-actions.true-shuffle'),
      icon: 'fas fa-random',
      ids: newestFirstIds,
      getIds: () => shuffle(newestFirstIds),
    },
    {
      key: 'favorites',
      label: t('music-artist.play-actions.favorites'),
      icon: 'fas fa-star',
      ids: favoriteIds,
      getIds: () => favoriteIds,
    },
    {
      key: 'unheard',
      label: t('music-artist.play-actions.unheard'),
      icon: 'fas fa-seedling',
      ids: unheardIds,
      getIds: () => unheardIds,
    },
    {
      key: 'top-tracks',
      label: t('music-artist.play-actions.top-tracks'),
      icon: 'fas fa-trophy',
      ids: topTrackIds,
      getIds: () => topTrackIds,
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
    <div className="artist-play-actions">
      <div className="artist-mix-row">
        <MixButton
          seedMediaType="music_artist"
          seedMediaId={artistId}
          dynamicQueueType="house_mix"
          icon="fas fa-dna"
          label={t('music-artist.play-actions.house-mix')}
        />
        <MixButton
          seedMediaType="music_artist"
          seedMediaId={artistId}
          dynamicQueueType="the_depths"
          icon="fas fa-anchor"
          label={t('music-artist.play-actions.from-the-depths')}
        />
      </div>

      <div className="artist-play-modes">
        {modes.map((mode) => (
          <Button
            key={mode.key}
            icon={mode.icon}
            title={mode.label}
            disabled={!mode.ids.length}
            onClick={() => handlePlay(mode.getIds)}
            choices={[
              {
                label: t('music-artist.play-actions.play-next'),
                icon: 'fas fa-step-forward',
                onSelect: () => handleQueueChoice(mode.getIds, 'next'),
              },
              {
                label: t('music-artist.play-actions.add-to-queue'),
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

export default ArtistPlayActions
