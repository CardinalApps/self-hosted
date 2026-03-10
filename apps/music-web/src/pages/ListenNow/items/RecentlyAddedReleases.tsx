import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import Carousel from '@cardinalapps/ui/src/components/interaction/Carousel'
import MusicRelease from '@cardinalapps/ui/src/components/interaction/MusicRelease'

import { MusicTrackType } from '@cardinalapps/ui/src/store/apis/musicTracks'
import { MusicReleaseType, useGetMusicReleasesQuery } from '@cardinalapps/ui/src/store/apis/musicReleases'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { librarySelectors } from '@cardinalapps/ui/src/store/slices/library'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'

import i18n from '../i18n.json'

function RecentlyAddedReleases() {
  const { lang } = useAppSelector(settingsSelectors.current)
  const libraries = useAppSelector(librarySelectors.current)

  const {
    data,
  } = useGetMusicReleasesQuery({
    orderBy: 'createdAt',
    order: 'DESC',
    take: 40,
    ...(libraries?.length ? { libraries } : {}),
  })

  const releases = Array.isArray(data) ? data[0] : []

  return (
    <Carousel
      title={i18n['recently-added-releases.title'][lang]}
      next={true}
      prev={true}
      itemWidth={'220px'}
      itemsPerSlide={2}
      items={releases.map((musicRelease: MusicReleaseType) => {
        return (
          <MusicRelease
            key={`item-${musicRelease?.musicReleaseId}`}
            tracks={musicRelease?.tracks as MusicTrackType[] || []}
            releaseId={musicRelease?.id}
            releaseTitle={musicRelease?.title}
            artistName={musicRelease?.artist?.name}
            //releaseYear={musicRelease.year}
            releaseLink={getAppUrl('release', {
              params: {
                ':id': musicRelease?.musicReleaseId?.toString() || '',
              },
            })}
            artistLink={getAppUrl('artist', {
              params: {
                ':id': musicRelease?.artist?.musicArtistId?.toString() || '',
              },
            })}
          />
        )
      })}
    />
  )
}

export default RecentlyAddedReleases
