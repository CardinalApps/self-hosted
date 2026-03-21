import { useState } from 'react'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { layoutSelectors } from '@cardinalapps/ui/src/store/slices/layout'
import {
  MusicTrackType,
  MusicTracksOrderBy,
  useGetInfiniteMusicTracksInfiniteQuery,
} from '@cardinalapps/ui/src/store/apis/musicTracks'
import { CommonOrderParams } from '@cardinalapps/ui/src/store/types/api'
import { ITEMS_PER_RTK_PAGE } from '@cardinalapps/ui/src/store/utils/infiniteScroll'
import VirtualLayout from '@cardinalapps/ui/src/components/features/AppBase/layouts/Virtual'
import MusicTrack from '@cardinalapps/ui/src/components/interaction/MusicTrack'
import { librarySelectors } from '@cardinalapps/ui/src/store/slices/library'

const ITEM_WIDTH = '100%'
const ITEM_HEIGHT = 61

type TracksInfiniteScrollProps = {
  virtualViewName: string,
  toolbarName: string,
}

function TracksInfiniteScroll({
  virtualViewName,
  toolbarName,
}: TracksInfiniteScrollProps) {
  const libraries = useAppSelector(librarySelectors.current)
  const { [toolbarName]: toolbarValues } = useAppSelector(layoutSelectors.toolbarValues)
  const { [virtualViewName]: virtualViewValues } = useAppSelector(layoutSelectors.virtualViews)
  const [initialRow] = useState(virtualViewValues?.start || 1)
  const initialPage = Math.floor((initialRow) / ITEMS_PER_RTK_PAGE)
  const [initialPageParam] = useState({
    take: ITEMS_PER_RTK_PAGE,
    skip: initialPage * ITEMS_PER_RTK_PAGE,
  })

  const {
    data,
    isSuccess,
    isLoading,
    hasNextPage,
    hasPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
  } = useGetInfiniteMusicTracksInfiniteQuery(
    {
      orderBy: toolbarValues?.orderBy as MusicTracksOrderBy,
      order: toolbarValues?.order as CommonOrderParams,
      ...(libraries?.length ? { libraries } : {}),
    },
    { initialPageParam },
  )

  const getItem = (musicTrack: MusicTrackType) => {
    return (
      <MusicTrack
        key={`item-${musicTrack?.musicTrackId}`}
        musicTrackId={musicTrack?.musicTrackId}
        trackTitle={musicTrack?.title}
        releaseTitle={musicTrack?.release?.title}
        releaseId={musicTrack?.release?.id}
        artistName={musicTrack?.artists?.[0]?.name}
      />
    )
  }

  return (
    <VirtualLayout
      virtualViewName={virtualViewName}
      itemHeight={ITEM_HEIGHT}
      itemWidth={ITEM_WIDTH}
      data={data}
      gap={5}
      getItem={getItem}
      isSuccess={isSuccess}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      hasPreviousPage={hasPreviousPage}
      fetchNextPage={fetchNextPage}
      fetchPreviousPage={fetchPreviousPage}
      isFetchingNextPage={isFetchingNextPage}
      isFetchingPreviousPage={isFetchingPreviousPage}
    />
  )
}

export default TracksInfiniteScroll
