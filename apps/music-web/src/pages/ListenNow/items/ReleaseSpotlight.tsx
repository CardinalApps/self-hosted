import Card from '@cardinalapps/ui/src/components/layout/Card'
import Shimmer from '@cardinalapps/ui/src/components/layout/Shimmer'
import Spotlight from '@cardinalapps/ui/src/components/interaction/Spotlight'
import Tags from '@cardinalapps/ui/src/components/interaction/Tags'
import H3 from '@cardinalapps/ui/src/components/typography/H3'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { useReleaseCovers } from '@cardinalapps/ui/src/hooks/useReleaseCovers'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { useGetMusicReleaseQuery } from '@cardinalapps/ui/src/store/apis/musicReleases'
import {
  MusicReleaseSpotlightType,
  useGetMusicReleaseSpotlightQuery,
} from '@cardinalapps/ui/src/store/apis/recommendations'

import DynamicQueueActionButton from '../../../components/DynamicQueueActionButton'
import { formatShortDate } from '../../../utils/date'

import i18n from '../i18n.json'

// Renders the reason the server picked the release as one friendly sentence
const reasonSentence = (spotlight: MusicReleaseSpotlightType, lang: string): string => {
  const { kind, trackTitle } = spotlight.reason

  if (kind === 'favorited_track' && trackTitle) {
    return i18n['release-spotlight.reason.favorited_track'][lang].replace('{track}', trackTitle)
  }

  // Kinds newer than this build fall back to the generic sentence instead of crashing the block
  return (i18n[`release-spotlight.reason.${kind}`] ?? i18n['release-spotlight.reason.library_pick'])[lang]
}

type ReleaseSpotlightProps = {
  /** This block's position among the page's release spotlights; each gets a different release and reason. */
  position?: number,
}

// The spotlighted release of the day, with the reason it was picked
function ReleaseSpotlight({ position = 0 }: ReleaseSpotlightProps) {
  const { lang } = useAppSelector(settingsSelectors.current)

  const {
    data,
    isLoading,
  } = useGetMusicReleaseSpotlightQuery({ position })

  const spotlight = data?.spotlight

  const { data: release } = useGetMusicReleaseQuery(
    { id: spotlight?.musicReleaseId ?? '' },
    { skip: !spotlight },
  )

  // The eligibility rules on the server guarantee the release has art for the hero
  const covers = useReleaseCovers(spotlight ? [spotlight.musicReleaseId] : [], 'medium_nocrop')
  const cover = spotlight ? covers[spotlight.musicReleaseId] : undefined

  if (isLoading) {
    return <Shimmer />
  }

  /* Later positions run dry long before the library is empty, so they say the day ran out of
     picks rather than blaming the library the way the first spotlight does. */
  if (!spotlight) {
    const emptyKey = position ? 'release-spotlight.empty-sequence' : 'release-spotlight.empty'

    return (
      <Card header={<H3>{i18n['release-spotlight.title'][lang]}</H3>}>
        <p>{i18n[emptyKey][lang]}</p>
      </Card>
    )
  }

  const tracks = release?.tracks ?? []
  const plays = tracks.reduce((total, track) => total + (Number(track.playCount) || 0), 0)
  const stats: string[] = []

  if (tracks.length) {
    const tracksKey = tracks.length === 1 ? 'release-spotlight.num-tracks.singular' : 'release-spotlight.num-tracks.plural'
    stats.push(i18n[tracksKey][lang].replace('{num}', String(tracks.length)))
  }

  if (plays) {
    const playsKey = plays === 1 ? 'release-spotlight.num-plays.singular' : 'release-spotlight.num-plays.plural'
    stats.push(i18n[playsKey][lang].replace('{num}', String(plays)))
  }

  return (
    <Spotlight
      kicker={`${i18n['release-spotlight.title'][lang]} #${position + 1}`}
      date={formatShortDate(new Date(), lang)}
      title={spotlight.title}
      titleLink={getAppUrl('release', {
        params: {
          ':id': spotlight.musicReleaseId,
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
            buttonId="release-spotlight"
            seedMediaType="music_release"
            seedMediaId={spotlight.musicReleaseId}
            icon="fas fa-star"
            label={i18n['action-buttons.spotlight'][lang]}
          />
          <DynamicQueueActionButton
            dynamicQueueType="house_mix"
            seedMediaType="music_release"
            seedMediaId={spotlight.musicReleaseId}
            icon="fas fa-dna"
            label={i18n['action-buttons.house-mix'][lang]}
          />
        </>
      }
    />
  )
}

export default ReleaseSpotlight
