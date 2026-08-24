import React, { useState } from 'react'

import Card from '@cardinalapps/ui/src/components/layout/Card'
import Carousel from '@cardinalapps/ui/src/components/interaction/Carousel'
import MusicTrack from '@cardinalapps/ui/src/components/interaction/MusicTrack'
import MusicTrackGhost from '@cardinalapps/ui/src/components/interaction/MusicTrackGhost'
import chunk from '@cardinalapps/ui/src/lib/array/chunk'
import H3 from '@cardinalapps/ui/src/components/typography/H3'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { librarySelectors } from '@cardinalapps/ui/src/store/slices/library'
import { MusicTrackType, useGetMusicTracksQuery } from '@cardinalapps/ui/src/store/apis/musicTracks'

import i18n from '../i18n.json'

const TRACKS_PER_PAGE = 8

// Tracks the user is currently hooked on, hottest first
function HotTracks() {
  const [pagination, setPagination] = useState<React.ReactNode>()
  const [prevBtn, setPrevBtn] = useState<React.ReactNode>()
  const [nextBtn, setNextBtn] = useState<React.ReactNode>()
  const { lang } = useAppSelector(settingsSelectors.current)
  const libraries = useAppSelector(librarySelectors.current)

  const {
    data,
  } = useGetMusicTracksQuery({
    hot: true,
    orderBy: 'hotPlays',
    order: 'DESC',
    take: TRACKS_PER_PAGE * 5,
    ...(libraries?.length ? { libraries } : {}),
  })

  const musicTracks = Array.isArray(data) ? data[0] : []
  const pages = chunk(musicTracks, TRACKS_PER_PAGE)

  return (
    <Card
      icon={<Icon fa="fas fa-fire" />}
      header={
        <>
          <H3>{i18n['hot-tracks.title'][lang]}</H3>
          {!!pagination && pagination}
        </>
      }
      headerRight={
        <>
          <p className="hot-tracks-note">{i18n['hot-tracks.note'][lang]}</p>
          {!!prevBtn && prevBtn}
          {!!nextBtn && nextBtn}
        </>
      }
    >
      {
        musicTracks.length
          ? (
            <Carousel
              columns={2}
              rows={TRACKS_PER_PAGE / 2}
              itemsPerSlide={1}
              dragFree={false}
              gap="10px"
              maxPages={pages.length}
              onChange={(state) => {
                setPagination(state.pagination())
                setPrevBtn(state.prevBtn())
                setNextBtn(state.nextBtn())
              }}
              items={pages.map((page) => page.map((musicTrack: MusicTrackType, i) => (
                <MusicTrack
                  key={i}
                  plays={musicTrack.playCount}
                  musicTrackId={musicTrack?.musicTrackId}
                  trackTitle={musicTrack?.title}
                  releaseId={musicTrack?.release?.id}
                  releaseTitle={musicTrack?.release?.title}
                  artistName={musicTrack?.artists?.[0]?.name}
                  rating={musicTrack?.rating}
                />
              )))}
            />
          )
          : <MusicTrackGhost className="hot-tracks-ghost" />
      }
    </Card>
  )
}

export default HotTracks
