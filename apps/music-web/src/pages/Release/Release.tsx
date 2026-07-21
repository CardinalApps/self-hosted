import { useContext, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import AnimatedGradient from '@cardinalapps/ui/src/components/layout/AnimatedGradient'
import Card from '@cardinalapps/ui/src/components/layout/Card'
import MusicRelease from '@cardinalapps/ui/src/components/interaction/MusicRelease'
import MusicTrack from '@cardinalapps/ui/src/components/interaction/MusicTrack'

import { RouterContext } from '@cardinalapps/ui/src/context/router'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { useReleaseCover } from '@cardinalapps/ui/src/hooks/useReleaseCover'
import { useCoverColors } from '@cardinalapps/ui/src/hooks/useCoverColors'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'
import { useGetMusicReleaseQuery } from '@cardinalapps/ui/src/store/apis/musicReleases'
import { MusicTrackType } from '@cardinalapps/ui/src/store/apis/musicTracks'
import { NetworkError } from '@cardinalapps/ui/src/components/layout/AccessError/AccessError'
import Toolbar from '../../../../../libraries/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '../../../../../libraries/ui/src/components/interaction/Toolbar/types'
import { MusicRoutes } from '../../../../../libraries/ui/src/lib/net/router'

import ReleaseMeta from './ReleaseMeta'

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

  const { enable_glass } = useAppSelector(settingsSelectors.current)
  const hasArtwork = !!data?.thumbnails?.length
  const [coverSrc] = useReleaseCover(hasArtwork ? releaseId : null, 'medium_nocrop')
  const coverColors = useCoverColors(coverSrc)

  /*
    Mounting AnimatedGradient before colors are sampled would hand it an empty values
    array; when the real colors arrive a moment later it treats that as going from 0
    blotches to N and grows each one from size 0. Waiting for colors first means it always
    mounts at full size, and the fade-in below is a plain opacity transition instead.
  */
  const [gradientVisible, setGradientVisible] = useState(false)
  useEffect(() => {
    if (!coverColors.length) {
      setGradientVisible(false)
      return
    }
    const raf = requestAnimationFrame(() => setGradientVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [coverColors])

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
          items={[[
            {
              slug: ToolbarItem.BREADCRUMBS,
              render: ToolbarItem.BREADCRUMBS,
              extra: {
                rootLink: MusicRoutes.releases,
                crumbs: [{ label: data?.title }],
              },
            },
          ]]}
        />
      )}
    >
      {!!enable_glass && !!coverColors.length &&
        <AnimatedGradient
          values={coverColors}
          className={clsx('release-page-background', gradientVisible && 'visible')}
          // Blotch size is a % of the gradient box's own diagonal, so the sidebar's
          // small-card defaults (70-120) wash into one smear across a full-viewport box.
          sizeMin={40}
          sizeMax={80}
        />
      }
      <div className="release-layout">
        <Card className={clsx('release-meta-card', enable_glass && 'glass')} padding="thin">
          <div className="release-meta-card-cols">
            <MusicRelease
              className="release-artwork"
              hasControls={false}
              hasArtwork={hasArtwork}
              releaseId={releaseId}
              coverSize={{
                width: 280,
                height: 280,
              }}
            />
            <ReleaseMeta release={data} />
          </div>
        </Card>
        <div className="release-bottom-row">
          <div className="release-left-col" />
          <div className="release-right-col">
            {tracksbyDiscInOrder.map((disc, i) => {
              return (
                <div key={`disc-${i}`} className="release-disc-tracks">
                  <p className="release-disc-number">{i18n['music-release.disc-number']['en'].replace('{num}', `${i + 1}`)}</p>
                  {disc.map((musicTrack: MusicTrackType, trackIndex: number) => {
                    // Upcoming tracks on this disc, then every remaining disc in full.
                    const musicTrackIds = [
                      ...disc.slice(trackIndex),
                      ...tracksbyDiscInOrder.slice(i + 1).flat(),
                    ].map((track: MusicTrackType) => track.musicTrackId)

                    return (
                      <MusicTrack
                        key={musicTrack.id}
                        musicTrackId={musicTrack?.musicTrackId}
                        trackTitle={musicTrack?.title}
                        releaseId={musicTrack?.release?.id}
                        trackNumber={musicTrack.trackNumber}
                        hasArtwork={!!musicTrack.thumbnails?.length}
                        rating={musicTrack?.rating}
                        plays={musicTrack?.playCount}
                        musicTrackIds={musicTrackIds}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppPage>
  )
}

export default ReleasePage
