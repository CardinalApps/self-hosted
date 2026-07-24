import { useState } from 'react'
import type { ReactNode } from 'react'
import { useSelector } from 'react-redux'

import Card from '../../layout/Card'
import Carousel from '../../interaction/Carousel'
import H5 from '../../typography/H5'
import MusicTrack from '../../interaction/MusicTrack'

import { settingsSelectors } from '../../../store/slices/settings'
import { useGetMusicHistoryQuery } from '../../../store/apis/musicHistory'
import type { MusicTrackType } from '../../../store/apis/musicTracks'
import chunk from '../../../lib/array/chunk'

import i18n from './i18n'

const TRACKS_PER_PAGE = 4
const MAX_PAGES = 3

// History repeats a track every time it is played, so extra rows are fetched to survive the dedupe below
const HISTORY_FETCH_SIZE = 40

/**
 * The idle sidebar's Recently Played section: the latest listens, presented in the same
 * paged carousel that the Listen Now page uses for its Most Played Tracks.
 */
const RecentlyPlayed = () => {
  const [pagination, setPagination] = useState<ReactNode>()
  const [prevBtn, setPrevBtn] = useState<ReactNode>()
  const [nextBtn, setNextBtn] = useState<ReactNode>()
  const { lang, enable_glass } = useSelector(settingsSelectors.current)

  const { data } = useGetMusicHistoryQuery({
    take: HISTORY_FETCH_SIZE,
    order: 'DESC',
  })

  const entries = Array.isArray(data) ? data[0] : []

  // Each track keeps only its most recent listen
  const tracks: MusicTrackType[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    if (!entry.track || seen.has(entry.track.musicTrackId)) {
      continue
    }
    seen.add(entry.track.musicTrackId)
    tracks.push(entry.track)
    if (tracks.length === TRACKS_PER_PAGE * MAX_PAGES) {
      break
    }
  }

  const grouped = chunk(tracks, TRACKS_PER_PAGE)

  if (!tracks.length) {
    return null
  }

  return (
    <Card
      className="playback-sidebar-recently-played"
      padding="none"
      bg={0}
      border={0}
      header={
        <>
          <H5>{i18n['playback-sidebar.recently-played'][lang as string]}</H5>
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
        /*
          The viewport bleeds to the sidebar's edges and pads itself back to the gutter, so
          the gap must be wider than the padding or the neighbouring page peeks through it.
        */
        gap="20px"
        glass={enable_glass as boolean}
        maxPages={grouped.length}
        onChange={(state) => {
          setPagination(state.pagination())
          setPrevBtn(state.prevBtn())
          setNextBtn(state.nextBtn())
        }}
        items={grouped.map((group: MusicTrackType[], i: number) => (
          <div key={i}>
            {group.map((track) => (
              <MusicTrack
                key={track.musicTrackId}
                musicTrackId={track.musicTrackId}
                trackTitle={track.title}
                releaseId={track.release?.id}
                releaseTitle={track.release?.title}
                artistName={track.artists?.[0]?.name}
                canRate={false}
                glass={enable_glass as boolean}
              />
            ))}
          </div>
        ))}
      />
    </Card>
  )
}

export default RecentlyPlayed
