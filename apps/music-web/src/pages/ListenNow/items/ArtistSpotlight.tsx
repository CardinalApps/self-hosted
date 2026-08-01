import { useMemo } from 'react'

import Card from '@cardinalapps/ui/src/components/layout/Card'
import Shimmer from '@cardinalapps/ui/src/components/layout/Shimmer'
import Spotlight from '@cardinalapps/ui/src/components/interaction/Spotlight'
import Tags from '@cardinalapps/ui/src/components/interaction/Tags'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { useReleaseCovers } from '@cardinalapps/ui/src/hooks/useReleaseCovers'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { useGetMusicArtistQuery } from '@cardinalapps/ui/src/store/apis/musicArtists'
import {
  MusicArtistSpotlightType,
  useGetMusicArtistSpotlightQuery,
} from '@cardinalapps/ui/src/store/apis/recommendations'

import DynamicQueueActionButton from '../../../components/DynamicQueueActionButton'

import i18n from '../i18n.json'

// Renders the reason the server picked the artist as one friendly sentence
const reasonSentence = (spotlight: MusicArtistSpotlightType, lang: string): string => {
  const { kind, trackTitle } = spotlight.reason

  if (kind === 'favorited_track' && trackTitle) {
    return i18n['artist-spotlight.reason.favorited_track'][lang].replace('{track}', trackTitle)
  }

  // Kinds newer than this build fall back to the generic sentence instead of crashing the block
  return (i18n[`artist-spotlight.reason.${kind}`] ?? i18n['artist-spotlight.reason.library_pick'])[lang]
}

type ArtistSpotlightProps = {
  /** This block's position among the page's spotlights; each gets a different artist and reason. */
  position?: number,
}

// The spotlighted artist of the day, with the reason it was picked
function ArtistSpotlight({ position = 0 }: ArtistSpotlightProps) {
  const { lang } = useAppSelector(settingsSelectors.current)

  const {
    data,
    isLoading,
  } = useGetMusicArtistSpotlightQuery({ position })

  const spotlight = data?.spotlight

  const { data: artist } = useGetMusicArtistQuery(
    { id: spotlight?.musicArtistId ?? '', summary: true },
    { skip: !spotlight },
  )

  /* The hero image is the cover of the artist's newest release that has art;
     the eligibility rules on the server guarantee at least one exists. */
  const heroReleaseIds = useMemo(() => {
    const releases = (artist?.summary?.releases ?? []).filter((release) => release.hasArtwork)
    releases.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    return releases.length ? [releases[0].musicReleaseId] : []
  }, [artist?.summary?.releases])

  const covers = useReleaseCovers(heroReleaseIds, 'medium_nocrop')
  const cover = heroReleaseIds.length ? covers[heroReleaseIds[0]] : undefined

  if (isLoading) {
    return <Shimmer />
  }

  if (!spotlight) {
    return (
      <Card header={<H5>{i18n['artist-spotlight.title'][lang]}</H5>}>
        <p>{i18n['artist-spotlight.empty'][lang]}</p>
      </Card>
    )
  }

  const summary = artist?.summary
  const stats: string[] = []

  if (summary) {
    const releasesKey = summary.numReleases === 1 ? 'artist-spotlight.num-releases.singular' : 'artist-spotlight.num-releases.plural'
    const tracksKey = summary.numTracks === 1 ? 'artist-spotlight.num-tracks.singular' : 'artist-spotlight.num-tracks.plural'
    stats.push(i18n[releasesKey][lang].replace('{num}', String(summary.numReleases)))
    stats.push(i18n[tracksKey][lang].replace('{num}', String(summary.numTracks)))

    if (summary.listening?.plays === 1) {
      stats.push(i18n['artist-spotlight.num-plays.singular'][lang].replace('{num}', '1'))
    } else if (summary.listening?.plays) {
      stats.push(i18n['artist-spotlight.num-plays.plural'][lang].replace('{num}', String(summary.listening.plays)))
    }
  }

  return (
    <Spotlight
      kicker={i18n['artist-spotlight.title'][lang]}
      title={spotlight.name}
      titleLink={getAppUrl('artist', {
        params: {
          ':id': spotlight.musicArtistId,
        },
      })}
      reason={reasonSentence(spotlight, lang)}
      image={cover?.src}
      imageColor={cover?.color}
      stats={!!stats.length && <Tags tags={stats} size="small" />}
      actions={
        <>
          <DynamicQueueActionButton
            dynamicQueueType={spotlight.queueType}
            buttonId="artist-spotlight"
            seedMediaType="music_artist"
            seedMediaId={spotlight.musicArtistId}
            icon="fas fa-star"
            label={i18n['action-buttons.spotlight'][lang]}
          />
          <DynamicQueueActionButton
            dynamicQueueType="house_mix"
            seedMediaType="music_artist"
            seedMediaId={spotlight.musicArtistId}
            icon="fas fa-dna"
            label={i18n['action-buttons.house-mix'][lang]}
          />
        </>
      }
    />
  )
}

export default ArtistSpotlight
