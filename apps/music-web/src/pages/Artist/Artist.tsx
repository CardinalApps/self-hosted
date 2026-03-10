import { useContext } from 'react'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import { NetworkError } from '@cardinalapps/ui/src/components/layout/AccessError/AccessError'
import { RouterContext } from '@cardinalapps/ui/src/context/router'
import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'
import { useGetMusicArtistQuery } from '@cardinalapps/ui/src/store/apis/musicArtists'
import H1 from '@cardinalapps/ui/src/components/typography/H1'
import ArtistReleases from './ArtistReleases'

import i18n from './i18n.json'

import './styles.css'

function ArtistPage() {
  const { useParams } = useContext(RouterContext)
  const params = useParams()
  const artistId = params?.id as string
  const {
    data,
    isLoading,
    error,
  } = useGetMusicArtistQuery({ id: artistId })

  return (
    <AppPage
      className="music-artist-page"
      layout={PAGE_LAYOUT.standard}
      pageTitle={i18n['music-artist.title']['en']}
      networkError={error as NetworkError}
      loading={isLoading}
      capabilities={['MusicArtists.Read']}
    >
      <H1 className="release-name">{data?.name}</H1>
      <ArtistReleases artist={data} />
    </AppPage>
  )
}

export default ArtistPage
