import { useContext, useMemo } from 'react'
import clsx from 'clsx'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Card from '@cardinalapps/ui/src/components/layout/Card'
import DiskMap, { type DiskMapBlock } from '@cardinalapps/ui/src/components/interaction/DiskMap'
import { NetworkError } from '@cardinalapps/ui/src/components/layout/AccessError/AccessError'
import { RouterContext } from '@cardinalapps/ui/src/context/router'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { useReleasesCoverColors } from '@cardinalapps/ui/src/hooks/useReleasesCoverColors'
import { useReleaseCovers } from '@cardinalapps/ui/src/hooks/useReleaseCovers'
import { secondsToMMSS } from '@cardinalapps/ui/src/lib/formatting/time'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'
import { useGetMusicArtistQuery } from '@cardinalapps/ui/src/store/apis/musicArtists'
import { MusicTrackType } from '@cardinalapps/ui/src/store/apis/musicTracks'
import { MusicReleaseType } from '@cardinalapps/ui/src/store/apis/musicReleases'
import Toolbar from '../../../../../libraries/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '../../../../../libraries/ui/src/components/interaction/Toolbar/types'
import { MusicRoutes } from '../../../../../libraries/ui/src/lib/net/router'

import ArtistMeta from './ArtistMeta'
import ArtistPlayActions from './ArtistPlayActions'
import ArtistTimeline from './ArtistTimeline'
import { buildDiscography, discographyTracks } from './discography'

import i18n from './i18n.json'

import './styles.css'

const TOOLBAR_NAME = 'music-artist-toolbar'

/* Stands in for a release whose cover art can't be read, so band colors stay aligned. A mid
   grey rather than a background tint, so the band still reads as a band. */
const NO_COVER_COLOR = 'var(--text-color-4)'

function ArtistPage() {
  const { useParams } = useContext(RouterContext)
  const params = useParams()
  const artistId = params?.id as string

  const {
    data,
    isLoading,
    error,
  } = useGetMusicArtistQuery({
    id: artistId,
    summary: true,
    playCount: true,
    rating: true,
  })

  const { enable_glass, lang } = useAppSelector(settingsSelectors.current)

  const discography = useMemo(
    () => buildDiscography((data?.releases ?? []) as MusicReleaseType[], data?.summary),
    [data?.releases, data?.summary],
  )

  // Only releases with artwork are worth sampling; the rest would return nothing anyway
  const releaseIdsWithArt = useMemo(() => (
    discography
      .filter((entry) => entry.hasArtwork && !!entry.musicReleaseId)
      .map((entry) => entry.musicReleaseId)
  ), [discography])

  const backgroundColors = useReleasesCoverColors(releaseIdsWithArt)
  const releaseCovers = useReleaseCovers(releaseIdsWithArt)

  /*
    The map reads like a defragmenter: oldest release first, so the discography grows from the
    top-left corner the way files land on a disk.
  */
  const chronological = useMemo(() => [...discography].reverse(), [discography])

  const diskMapBlocks = useMemo((): DiskMapBlock[] => {
    const files = data?.summary?.files ?? []

    if (!files.length) {
      return []
    }

    const tracksById = new Map(
      discographyTracks(discography).map((track) => [track.musicTrackId, track as MusicTrackType]),
    )

    const filesByRelease = new Map<string, typeof files>()
    for (const file of files) {
      const key = file.musicReleaseId ?? ''
      if (!filesByRelease.has(key)) {
        filesByRelease.set(key, [])
      }
      filesByRelease.get(key).push(file)
    }

    const groups = chronological.map((entry) => ({
      groupId: entry.musicReleaseId,
      groupLabel: entry.title,
      files: filesByRelease.get(entry.musicReleaseId) ?? [],
    }))

    // Loose files that belong to no release still occupy disk, so they get a band of their own
    const looseFiles = filesByRelease.get('') ?? []
    if (looseFiles.length) {
      groups.push({
        groupId: '',
        groupLabel: i18n['music-artist.disk-map.loose-tracks'][lang],
        files: looseFiles,
      })
    }

    return groups.flatMap((group) => group.files.map((file) => {
      const track = tracksById.get(file.musicTrackId)
      const extension = file.extension.toUpperCase()
      // The track's own bitrate, which the file reports; nothing here judges what it means
      const kbps = track?.bitrate
        ? i18n['music-artist.meta.kbps'][lang].replace('{kbps}', String(Math.round(Number(track.bitrate) / 1000)))
        : null

      return {
        id: file.musicTrackId,
        groupId: group.groupId,
        groupLabel: group.groupLabel,
        label: file.title ?? track?.title,
        bytes: file.bytes,
        details: [
          track?.duration ? secondsToMMSS(Number(track.duration)) : null,
          kbps ? `${extension} ${kbps}` : extension,
        ].filter(Boolean),
      }
    }))
  }, [data?.summary?.files, chronological, discography, lang])

  const diskMapPalette = useMemo(
    () => chronological.map((entry) => releaseCovers[entry.musicReleaseId]?.color || NO_COVER_COLOR),
    [chronological, releaseCovers],
  )

  const diskMapCovers = useMemo(() => Object.fromEntries(
    Object.entries(releaseCovers).map(([musicReleaseId, cover]) => [musicReleaseId, cover.src]),
  ), [releaseCovers])

  const releaseLinks = useMemo(() => Object.fromEntries(
    discography.map((entry) => [
      entry.musicReleaseId,
      getAppUrl('release', { params: { ':id': entry.musicReleaseId } }),
    ]),
  ), [discography])

  return (
    // The page title is the category rather than the artist, so it would head the page wrongly
    <AppPage
      className="music-artist-page"
      layout={PAGE_LAYOUT.standard}
      pageTitle={i18n['music-artist.title']['en']}
      showMobileTitle={false}
      networkError={error as NetworkError}
      loading={isLoading}
      capabilities={['MusicArtists.Read']}
      animatedGradientColors={backgroundColors}
      toolbar={(
        <Toolbar
          name={TOOLBAR_NAME}
          items={[[
            {
              slug: ToolbarItem.BREADCRUMBS,
              render: ToolbarItem.BREADCRUMBS,
              extra: {
                rootLink: MusicRoutes.artists,
                crumbs: [{ label: data?.name }],
              },
            },
          ]]}
        />
      )}
    >
      <div className="artist-layout">
        <Card className={clsx('artist-hero-card', enable_glass && 'glass')} padding="thin">
          <div className="artist-hero-cols">
            <DiskMap
              className="artist-disk-map"
              blocks={diskMapBlocks}
              palette={diskMapPalette}
              groupLinks={releaseLinks}
              groupImages={diskMapCovers}
            />

            <ArtistMeta artist={data} tracks={discographyTracks(discography) as MusicTrackType[]} />
          </div>
        </Card>

        <ArtistPlayActions
          artistId={artistId}
          discography={discography}
        />

        <ArtistTimeline
          discography={discography}
          artistName={data?.name}
          artistLink={getAppUrl('artist', { params: { ':id': artistId } })}
        />
      </div>
    </AppPage>
  )
}

export default ArtistPage
