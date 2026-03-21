import { useState } from 'react'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { layoutSelectors } from '@cardinalapps/ui/src/store/slices/layout'
import {
  MusicArtistType,
  MusicArtistOrderBy,
  useGetInfiniteMusicArtistsInfiniteQuery,
} from '@cardinalapps/ui/src/store/apis/musicArtists'
import { CommonOrderParams } from '@cardinalapps/ui/src/store/types/api'
import { ITEMS_PER_RTK_PAGE } from '@cardinalapps/ui/src/store/utils/infiniteScroll'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'
import VirtualLayout from '@cardinalapps/ui/src/components/features/AppBase/layouts/Virtual'
import MusicArtist from '@cardinalapps/ui/src/components/interaction/MusicArtist'
import { librarySelectors } from '@cardinalapps/ui/src/store/slices/library'

const ITEM_WIDTH = 320
const ITEM_HEIGHT = 285

type TracksInfiniteScrollProps = {
  virtualViewName: string,
  toolbarName: string,
}

function ReleasesInfiniteScroll({
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
  } = useGetInfiniteMusicArtistsInfiniteQuery(
    {
      orderBy: toolbarValues?.orderBy as MusicArtistOrderBy,
      order: toolbarValues?.order as CommonOrderParams,
      ...(libraries?.length ? { libraries } : {}),
    },
    {
      initialPageParam,
      refetchOnMountOrArgChange: true,
    },
  )

  const getItem = (musicArtist: MusicArtistType) => {
    return (
      <MusicArtist
        key={`item-${musicArtist?.musicArtistId}`}
        name={musicArtist?.name}
        image={'/music/images/placeholder.jpg'}
        numReleases={musicArtist?.releases?.length || 0}
        numTracks={musicArtist?.tracks?.length || 0}
        link={getAppUrl('artist', {
          params: {
            ':id': musicArtist?.musicArtistId?.toString() || '',
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
