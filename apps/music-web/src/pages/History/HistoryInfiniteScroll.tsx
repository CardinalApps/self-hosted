import { useContext, useState } from 'react'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { layoutSelectors } from '@cardinalapps/ui/src/store/slices/layout'
import { MusicHistoryEntryType, useGetInfiniteMusicHistoryInfiniteQuery } from '@cardinalapps/ui/src/store/apis/musicHistory'
import { CommonOrderParams } from '@cardinalapps/ui/src/store/types/api'
import { ITEMS_PER_RTK_PAGE } from '@cardinalapps/ui/src/store/utils/infiniteScroll'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import VirtualLayout from '@cardinalapps/ui/src/components/features/AppBase/layouts/Virtual'
import { formatDate, formatTimeAgo } from '@cardinalapps/ui/src/lib/formatting/time'
import UserTag from '@cardinalapps/ui/src/components/interaction/UserTag'
import ProgressCircle from '@cardinalapps/ui/src/components/layout/ProgressCircle'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'
import { RouterContext } from '@cardinalapps/ui/src/context/router'

import i18n from './i18n.json'
import Card from '@cardinalapps/ui/src/components/layout/Card'
import MusicRelease from '../../../../../libraries/ui/src/components/interaction/MusicRelease'

const ITEM_WIDTH = '100%'
const ITEM_HEIGHT = 50

type MusicHistoryInfiniteScrollProps = {
  virtualViewName: string,
  toolbarName: string,
}

function MusicHistoryInfiniteScroll({
  virtualViewName,
  toolbarName,
}: MusicHistoryInfiniteScrollProps) {
  const { Link } = useContext(RouterContext)
  const { lang } = useAppSelector(settingsSelectors.current)
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
} = useGetInfiniteMusicHistoryInfiniteQuery(
    {
      order: toolbarValues?.order as CommonOrderParams,
    },
    {
      initialPageParam,
      refetchOnMountOrArgChange: true,
    },
  )


  const getItem = (historyEntry: MusicHistoryEntryType) => {
    const musicRelease = historyEntry.track?.release
    return (
      <Card className="music-history-entry" padding={0} border={1} key={musicRelease.id}>
        <div className="cols">
          <div className="artwork-col">
            <MusicRelease
              key={`item-${musicRelease?.musicReleaseId}`}
              releaseId={musicRelease?.id}
              hasControls={false}
              coverSize={{ width: 30, height: 30 }}
              releaseLink={getAppUrl('release', {
                params: {
                  ':id': musicRelease?.musicReleaseId?.toString() || '',
                },
              })}
            />
          </div>
          <div className="track-col">
            <Link to={getAppUrl('release', { params: { ':id': historyEntry.track.release?.musicReleaseId } })}>{historyEntry?.track?.title}</Link>
          </div>
          <div className="date-col">
            <time title={formatDate(historyEntry?.updatedAt)}>
              {formatTimeAgo(historyEntry?.updatedAt)}
            </time>
          </div>
          <div className="progress-col">
            <ProgressCircle current={historyEntry.progress} fontSize={9} size={35} showPercentage={true} />
          </div>
          <div className="user-col">
            <UserTag user={historyEntry.user} size='xs' showName={false} />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <VirtualLayout
        className="history-infinite-scroll"
        virtualViewName={virtualViewName}
        itemHeight={ITEM_HEIGHT}
        itemWidth={ITEM_WIDTH}
        data={data}
        gap={8}
        getItem={getItem}
        isSuccess={isSuccess}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        fetchNextPage={fetchNextPage}
        fetchPreviousPage={fetchPreviousPage}
        isFetchingNextPage={isFetchingNextPage}
        isFetchingPreviousPage={isFetchingPreviousPage}
        emptyTitle={i18n['music-history.empty.title'][lang]}
        emptyMessage={i18n['music-history.empty.message'][lang]}
        emptyButton={false}
      />
    </>
  )
}

export default MusicHistoryInfiniteScroll
