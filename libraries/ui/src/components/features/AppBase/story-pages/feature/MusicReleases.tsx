import AppPage from '../../AppPage'

import P from '../../../../typography/P'
import Loading from '../../../../layout/Loading'
import MusicRelease from '../../../../interaction/MusicRelease'

import { PAGE_LAYOUT } from '../../../../../store/slices/layout'
import { useGetMusicReleasesQuery } from '../../../../../store/apis/musicReleases'

import { HOME_SERVER_HOST } from '../../../../../../env'

function MusicReleasesPage() {
  const {
    data: musicReleasesResponse,
    isLoading: musicReleasesLoading,
    error: musicReleasesError = {},
  } = useGetMusicReleasesQuery({
    take: 12,
    skip: 0,
    order: 'asc',
    tracks: true,
    thumbnails: true,
    artists: true,
  })
  const [musicReleases = []] = musicReleasesResponse || []

  return (
    <AppPage layout={PAGE_LAYOUT.standard} pageTitle="Feature: Releases">
      <P>This will use releases from your running dev home server.</P>
      {'error' in musicReleasesError && <P>{musicReleasesError?.error}</P>}
      {musicReleasesLoading
        ? <Loading />
        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {
              musicReleases.map((release, i) => {
                const thumb = release?.thumbnails?.find?.((t) => t.size === 'small_nocrop')?.relativeSrc
                return (
                  <MusicRelease
                    key={i}
                    artwork={thumb ? `${HOME_SERVER_HOST}${thumb}` : undefined}
                    tracks={release.tracks}
                    releaseTitle={release.title}
                    artistName={release?.artists?.[0]?.name as string}
                  />
                )
              })
            }
          </div>
      }
    </AppPage>
  )
}

export default MusicReleasesPage
