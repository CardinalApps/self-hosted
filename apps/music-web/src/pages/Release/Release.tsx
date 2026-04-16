import { useContext, useMemo } from 'react'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import MusicRelease from '@cardinalapps/ui/src/components/interaction/MusicRelease'
import MusicTrack from '@cardinalapps/ui/src/components/interaction/MusicTrack'

import { RouterContext } from '@cardinalapps/ui/src/context/router'
import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'
import { useGetMusicReleaseQuery } from '@cardinalapps/ui/src/store/apis/musicReleases'
import { MusicTrackType } from '@cardinalapps/ui/src/store/apis/musicTracks'
import { NetworkError } from '@cardinalapps/ui/src/components/layout/AccessError/AccessError'
import Toolbar from '../../../../../libraries/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '../../../../../libraries/ui/src/components/interaction/Toolbar/types'
import { MusicRoutes } from '../../../../../libraries/ui/src/lib/net/router'

import ReleaseArtists from './ReleaseArtists'
import ReleaseMeta from './ReleaseMeta'
import ReleaseGenres from './ReleaseGenres'

import i18n from './i18n.json'

import './styles.css'

const TOOLBAR_NAME = 'music-release-toolbar'

function ReleasePage() {
  const { useParams } = useContext(RouterContext)
  const params = useParams()
  const releaseId = params?.id as string
  const {
    data,
    isLoading,
    error,
  } = useGetMusicReleaseQuery({ id: releaseId })

  const artists = data?.artists || []

  /**
   * Order tracks by disc then number.
   */
  const tracksbyDiscInOrder = useMemo(() => {
    if (!data?.tracks || !Array.isArray(data.tracks)) {
      return []
    }

    const groupedByDisc = []

    for (const track of data.tracks as MusicTrackType[]) {
      const discIndex = track?.discNumber - 1 || 0
      if (!groupedByDisc[discIndex]) {
        groupedByDisc[discIndex] = []
      }
      groupedByDisc[discIndex].push(track)
    }

    return groupedByDisc.map((disc) => disc.sort((a: MusicTrackType, b: MusicTrackType) => a.trackNumber - b.trackNumber))
  }, [data?.tracks])

  return (
    <AppPage
      className="music-release-page"
      layout={PAGE_LAYOUT.standard}
      pageTitle={i18n['music-release.title']['en']}
      networkError={error as NetworkError}
      loading={isLoading}
      capabilities={['MusicReleases.Read']}
      toolbar={(
        <Toolbar
          name={TOOLBAR_NAME}
          items={[
            {
              slug: ToolbarItem.BREADCRUMBS,
              render: ToolbarItem.BREADCRUMBS,
              extra: {
                rootLink: MusicRoutes.releases,
                crumbs: [{ label: data?.title }],
              },
            },
          ]}
        />
      )}
    >
      <div className="release-page-cols">
        <div className="release-left-col">
          <MusicRelease
            className="release-artwork"
            hasControls={false}
            hasArtwork={!!data?.thumbnails?.length}
            releaseId={releaseId}
            tracks={data?.tracks as MusicTrackType[] || []}
            coverSize={{
              width: 340,
              height: 340,
            }}
          />
          <ReleaseArtists release={data} />
          <ReleaseGenres release={data} />
          <ReleaseMeta release={data} />
        </div>
        <div className="release-right-col">
          {tracksbyDiscInOrder.map((disc, i) => {
            return (
              <div key={`disc-${i}`} className="release-disc-tracks">
                <p className="release-disc-number">{i18n['music-release.disc-number']['en'].replace('{num}', `${i + 1}`)}</p>
                {disc.map((musicTrack: MusicTrackType) => {
                  return (
                    <MusicTrack
                      key={musicTrack.id}
                      musicTrackId={musicTrack?.musicTrackId}
                      trackTitle={musicTrack?.title}
                      releaseId={musicTrack?.release?.id}
                      trackNumber={musicTrack.trackNumber}
                      artistName={artists?.[0]?.name as string}
                      hasArtwork={!!musicTrack.thumbnails?.length}
                      rating={musicTrack?.rating}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </AppPage>
  )
}

export default ReleasePage
