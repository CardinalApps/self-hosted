import { useContext, useState } from 'react'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { layoutSelectors } from '@cardinalapps/ui/src/store/slices/layout'
import {
  MusicTracksOrderBy,
} from '@cardinalapps/ui/src/store/apis/musicTracks'
import { MusicHistoryEntryType, useGetInfiniteMusicHistoryInfiniteQuery } from '@cardinalapps/ui/src/store/apis/musicHistory'
import { CommonOrderParams } from '@cardinalapps/ui/src/store/types/api'
import { ITEMS_PER_RTK_PAGE } from '@cardinalapps/ui/src/store/utils/infiniteScroll'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import VirtualLayout from '@cardinalapps/ui/src/components/features/AppBase/layouts/Virtual'
import { formatDate, formatTimeAgo } from '@cardinalapps/ui/src/lib/formatting/time'
import UserTag from '@cardinalapps/ui/src/components/interaction/UserTag'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'
import { RouterContext } from '@cardinalapps/ui/src/context/router'

import i18n from './i18n.json'

const ITEM_WIDTH = '100%'
const ITEM_HEIGHT = 44

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
      orderBy: toolbarValues?.orderBy as MusicTracksOrderBy,
      order: toolbarValues?.order as CommonOrderParams,
    },
    { initialPageParam },
  )

  const getItem = (historyEntry: MusicHistoryEntryType) => {
    // FIXME
    if (!historyEntry) {
      console.warn('No entry?', historyEntry)
      return null
    }
    return (
      <div className="music-history-entry">
        <div className="progress-bar" style={{ width: `${(historyEntry?.progress || 0) * 100}%` }}></div>
        <div className="cols">
          <div>{Math.round(historyEntry?.progress * 100)}%</div>
          <div>{<UserTag user={historyEntry.user} size='xs' showName={false} />}</div>
          <div><Link to={getAppUrl('release', { params: { ':id': historyEntry.track.release?.musicReleaseId } })}>{historyEntry?.track?.title}</Link></div>
          <div className="date">
            <time title={formatDate(historyEntry?.updatedAt)}>
              {formatTimeAgo(historyEntry?.updatedAt)}
            </time>
          </div>
        </div>
      </div>
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
