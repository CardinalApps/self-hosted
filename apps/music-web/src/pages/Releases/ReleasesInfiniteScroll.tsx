import { useState } from 'react'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { layoutSelectors } from '@cardinalapps/ui/src/store/slices/layout'
import {
  MusicReleaseType,
  ReleasesSortParams,
  useGetInfiniteMusicReleasesInfiniteQuery,
} from '@cardinalapps/ui/src/store/apis/musicReleases'
import { CommonOrderParams } from '@cardinalapps/ui/src/store/types/api'
import { ITEMS_PER_RTK_PAGE } from '@cardinalapps/ui/src/store/utils/infiniteScroll'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'
import VirtualLayout from '@cardinalapps/ui/src/components/features/AppBase/layouts/Virtual'
import MusicRelease from '@cardinalapps/ui/src/components/interaction/MusicRelease'
import { MusicTrackType } from '@cardinalapps/ui/src/store/apis/musicTracks'

const ITEM_WIDTH = 220
const ITEM_HEIGHT = 275

type TracksInfiniteScrollProps = {
  virtualViewName: string,
  toolbarName: string,
}

function ReleasesInfiniteScroll({
  virtualViewName,
  toolbarName,
}: TracksInfiniteScrollProps) {
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
  } = useGetInfiniteMusicReleasesInfiniteQuery(
    {
      sort: toolbarValues?.sort as ReleasesSortParams,
      order: toolbarValues?.order as CommonOrderParams,
    },
    {
      initialPageParam,
      refetchOnMountOrArgChange: true,
    },
  )

  const getItem = (musicRelease: MusicReleaseType) => {
    return (
      <MusicRelease
        key={`item-${musicRelease?.musicReleaseId}`}
        tracks={musicRelease?.tracks as MusicTrackType[] || []}
        releaseId={musicRelease?.id}
        releaseTitle={musicRelease?.title}
        artistName={musicRelease?.artist?.name}
        //releaseYear={musicRelease.year}
        releaseLink={getAppUrl('release', {
          params: {
            ':id': musicRelease?.musicReleaseId?.toString() || '',
          },
        })}
        artistLink={getAppUrl('artist', {
          params: {
            ':id': musicRelease?.artist?.musicArtistId?.toString() || '',
          },
        })}
      />
    )
  }

  return (
    <VirtualLayout
      virtualViewName={virtualViewName}
      itemHeight={ITEM_HEIGHT}
      itemWidth={ITEM_WIDTH}
      data={data}
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

export default ReleasesInfiniteScroll
