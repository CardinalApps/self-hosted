import MusicArtist from '@cardinalapps/ui/src/components/interaction/MusicArtist'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import Shimmer from '@cardinalapps/ui/src/components/layout/Shimmer'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { librarySelectors } from '@cardinalapps/ui/src/store/slices/library'
import { MusicArtistType, useGetMusicArtistsQuery } from '@cardinalapps/ui/src/store/apis/musicArtists'

import i18n from '../i18n.json'

const MAX_ARTISTS = 6

// The most recently added artists, most recent first
function RecentlyAddedArtists() {
  const { lang } = useAppSelector(settingsSelectors.current)
  const libraries = useAppSelector(librarySelectors.current)

  const {
    data,
    isLoading,
  } = useGetMusicArtistsQuery({
    orderBy: 'createdAt',
    order: 'DESC',
    take: MAX_ARTISTS,
    releases: true,
    tracks: true,
    ...(libraries?.length ? { libraries } : {}),
  })

  if (isLoading) {
    return <Shimmer />
  }

  const artists = Array.isArray(data) ? data[0] : []

  return (
    <div className="recently-added-artists">
      <H5 className="recently-added-artists-title">{i18n['recently-added-artists.title'][lang]}</H5>
      {
        artists.length
          ? (
            <div className="recently-added-artists-grid">
              {artists.map((artist: MusicArtistType) => (
                <MusicArtist
                  key={`item-${artist.musicArtistId}`}
                  name={artist.name}
                  numReleases={artist.releases?.length || 0}
                  numTracks={artist.tracks?.length || 0}
                  link={getAppUrl('artist', {
                    params: {
                      ':id': artist.musicArtistId?.toString() || '',
                    },
                  })}
                />
              ))}
            </div>
          )
          : <p>{i18n['recently-added-artists.empty'][lang]}</p>
      }
    </div>
  )
}

export default RecentlyAddedArtists
