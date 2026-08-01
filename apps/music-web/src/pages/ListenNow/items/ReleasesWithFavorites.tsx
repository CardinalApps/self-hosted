import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import Carousel from '@cardinalapps/ui/src/components/interaction/Carousel'
import MusicRelease from '@cardinalapps/ui/src/components/interaction/MusicRelease'
import Shimmer from '@cardinalapps/ui/src/components/layout/Shimmer'
import H5 from '@cardinalapps/ui/src/components/typography/H5'

import { MusicTrackType } from '@cardinalapps/ui/src/store/apis/musicTracks'
import { MusicReleaseType, useGetMusicReleasesQuery } from '@cardinalapps/ui/src/store/apis/musicReleases'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { librarySelectors } from '@cardinalapps/ui/src/store/slices/library'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'

import i18n from '../i18n.json'

// Releases containing at least one favorite, most recently favorited first
function ReleasesWithFavorites() {
  const { lang } = useAppSelector(settingsSelectors.current)
  const libraries = useAppSelector(librarySelectors.current)

  const {
    data,
    isLoading,
  } = useGetMusicReleasesQuery({
    favorites: true,
    orderBy: 'favoritedAt',
    order: 'DESC',
    take: 40,
    tracks: true,
    artists: true,
    ...(libraries?.length ? { libraries } : {}),
  })

  if (isLoading) {
    return <Shimmer />
  }

  const releases = Array.isArray(data) ? data[0] : []

  if (!releases.length) {
    return (
      <div className="carousel">
        <header className="carousel-header">
          <H5 className="carousel-title">
            {i18n['releases-with-favorites.title'][lang]}
          </H5>
        </header>
        <p>{i18n['releases-with-favorites.empty'][lang]}</p>
      </div>
    )
  }

  return (
    <Carousel
      title={i18n['releases-with-favorites.title'][lang]}
      next={true}
      prev={true}
      itemWidth={'240px'}
      itemsPerSlide={2}
      gap="20px"
      items={releases.map((musicRelease: MusicReleaseType) => {
        return (
          <MusicRelease
            key={`item-${musicRelease?.musicReleaseId}`}
            tracks={musicRelease?.tracks as MusicTrackType[] || []}
            releaseId={musicRelease?.id}
            releaseTitle={musicRelease?.title}
            artistName={musicRelease?.artist?.name}
            coverSize={{ width: 220, height: 220 }}
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

export default ReleasesWithFavorites
