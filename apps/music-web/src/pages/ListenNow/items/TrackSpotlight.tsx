import Card from '@cardinalapps/ui/src/components/layout/Card'
import Shimmer from '@cardinalapps/ui/src/components/layout/Shimmer'
import Spotlight from '@cardinalapps/ui/src/components/interaction/Spotlight'
import MusicTrack from '@cardinalapps/ui/src/components/interaction/MusicTrack'
import H3 from '@cardinalapps/ui/src/components/typography/H3'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { useReleaseCovers } from '@cardinalapps/ui/src/hooks/useReleaseCovers'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { useGetMusicTrackQuery } from '@cardinalapps/ui/src/store/apis/musicTracks'
import {
  MusicTrackSpotlightType,
  useGetMusicTrackSpotlightQuery,
} from '@cardinalapps/ui/src/store/apis/recommendations'

import { formatShortDate } from '../../../utils/date'

import i18n from '../i18n.json'

// Renders the reason the server picked the track as one friendly sentence
const reasonSentence = (spotlight: MusicTrackSpotlightType, lang: string): string => {
  const { kind } = spotlight.reason

  // Kinds newer than this build fall back to the generic sentence instead of crashing the block
  return (i18n[`track-spotlight.reason.${kind}`] ?? i18n['track-spotlight.reason.library_pick'])[lang]
}

type TrackSpotlightProps = {
  /** This block's position among the page's track spotlights; each gets a different track and reason. */
  position?: number,
}

// The spotlighted track of the day, with the reason it was picked
function TrackSpotlight({ position = 0 }: TrackSpotlightProps) {
  const { lang } = useAppSelector(settingsSelectors.current)

  const {
    data,
    isLoading,
  } = useGetMusicTrackSpotlightQuery({ position })

  const spotlight = data?.spotlight

  // The spotlight payload carries no rating, so the row gets it from the track itself
  const { data: track } = useGetMusicTrackQuery(
    { id: spotlight?.musicTrackId ?? '' },
    { skip: !spotlight },
  )

  // A track has no art of its own, so the hero is the cover of the release it sits on
  const heroReleaseIds = spotlight?.musicReleaseId ? [spotlight.musicReleaseId] : []
  const covers = useReleaseCovers(heroReleaseIds, 'medium_nocrop')
  const cover = heroReleaseIds.length ? covers[heroReleaseIds[0]] : undefined

  if (isLoading) {
    return <Shimmer />
  }

  /* Later positions run dry long before the library is empty, so they say the day ran out of
     picks rather than blaming the library the way the first spotlight does. */
  if (!spotlight) {
    const emptyKey = position ? 'track-spotlight.empty-sequence' : 'track-spotlight.empty'

    return (
      <Card header={<H3>{i18n['track-spotlight.title'][lang]}</H3>}>
        <p>{i18n[emptyKey][lang]}</p>
      </Card>
    )
  }

  return (
    <Spotlight
      className="track-spotlight"
      kicker={`${i18n['track-spotlight.title'][lang]} #${position + 1}`}
      date={formatShortDate(new Date(), lang)}
      title={spotlight.title}
      titleLink={spotlight.musicReleaseId
        ? getAppUrl('release', {
          params: {
            ':id': spotlight.musicReleaseId,
          },
        })
        : undefined
      }
      reason={reasonSentence(spotlight, lang)}
      image={cover?.src}
      imageColor={cover?.color}
      actions={
        <MusicTrack
          musicTrackId={spotlight.musicTrackId}
          trackTitle={spotlight.title}
          releaseTitle={spotlight.releaseTitle ?? undefined}
          artistName={spotlight.artistName ?? undefined}
          rating={(track?.rating ?? null) as number | null}
          hasArtwork={false}
        />
      }
    />
  )
}

export default TrackSpotlight
