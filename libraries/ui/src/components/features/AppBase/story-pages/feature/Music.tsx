import AppPage from '../../AppPage'

import P from '../../../../typography/P'
import Loading from '../../../../layout/Loading'
import MusicTrack from '../../../../interaction/MusicTrack'

import { PAGE_LAYOUT } from '../../../../../store/slices/layout'
import { useGetMusicTracksQuery } from '../../../../../store/apis/musicTracks'

function MusicPage() {
  const {
    data: musicTracksResponse,
    isLoading: musicTracksLoading,
    error: musicTracksError = {},
    // refetch: refretchMusicTracks,
  } = useGetMusicTracksQuery({ take: 12, skip: 0, order: 'ASC' })
  const [musicTracks = []] = musicTracksResponse || []

  return (
    <AppPage layout={PAGE_LAYOUT.standard} pageTitle="Feature: Music">
      <P>This will use tracks from your running dev home server.</P>
      {'error' in musicTracksError && <P>{musicTracksError?.error}</P>}
      {musicTracksLoading
        ? <Loading />
        : musicTracks.map((musicTrack, i) => {
          return (
            <MusicTrack
              key={i}
              musicTrackId={musicTrack?.musicTrackId}
              trackTitle={musicTrack?.title}
              releaseId={musicTrack?.release?.id}
              releaseTitle={musicTrack?.release?.title}
              trackNumber={musicTrack.trackNumber}
              artistName={musicTrack?.artists?.[0]?.name}
            />
          )
        })
      }
    </AppPage>
  )
}

export default MusicPage
