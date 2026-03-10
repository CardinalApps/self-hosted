import React from 'react'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import Carousel from '@cardinalapps/ui/src/components/interaction/Carousel'
import Card from '@cardinalapps/ui/src/components/layout/Card'
import H5 from '@cardinalapps/ui/src/components/typography/H5'

import { MusicTrackType, useGetMusicTracksQuery } from '@cardinalapps/ui/src/store/apis/musicTracks'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { librarySelectors } from '@cardinalapps/ui/src/store/slices/library'
import MusicTrack from '@cardinalapps/ui/src/components/interaction/MusicTrack'
import chunk from '@cardinalapps/ui/src/lib/array/chunk'

import i18n from '../i18n.json'
import { useState } from 'react'

function MostPlayedTracks() {
  const [pagination, setPagination] = useState<React.ReactNode>()
  const [prevBtn, setPrevBtn] = useState<React.ReactNode>()
  const [nextBtn, setNextBtn] = useState<React.ReactNode>()
  const { lang } = useAppSelector(settingsSelectors.current)
  const libraries = useAppSelector(librarySelectors.current)

  const {
    data,
  } = useGetMusicTracksQuery({
    sort: 'playCount',
    order: 'DESC',
    take: 40,
    ...(libraries?.length ? { libraries } : {}),
  })

  const musicTracks = Array.isArray(data) ? data[0] : []
  const grouped = chunk(musicTracks, 4)

  return (
    <Card
      header={
        <>
          <H5>{i18n['most-played-tracks.title'][lang]}</H5>
          {!!pagination && pagination}
        </>
      }
      headerRight={
        <>
          {!!prevBtn && prevBtn}
          {!!nextBtn && nextBtn}
        </>
      }
    >
      <Carousel
        itemsPerSlide={1}
        dragFree={false}
        gap="10px"
        maxPages={grouped.length}
        onChange={(state) => {
          setPagination(state.pagination())
          setPrevBtn(state.prevBtn())
          setNextBtn(state.nextBtn())
        }}
        items={grouped.map((groups, i) => {
          return (
            <div key={i}>
              {
                groups.map((musicTrack: MusicTrackType, i) => {
                  return (
                    <MusicTrack
                      key={i}
                      plays={musicTrack.playCount}
                      musicTrackId={musicTrack?.musicTrackId}
                      trackTitle={musicTrack?.title}
                      releaseId={musicTrack?.release?.id}
                      releaseTitle={musicTrack?.release?.title}
                      artistName={musicTrack?.artists?.[0]?.name}
                    />
                  )
                })
              }
            </div>
          )
        })}
      />
    </Card>
  )
}

export default MostPlayedTracks
