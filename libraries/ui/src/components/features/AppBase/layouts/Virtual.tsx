import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import clsx from 'clsx'
import Loading from '../../../layout/Loading'

import {
  layoutActions,
  layoutSelectors,
} from '../../../../store/slices/layout'
import { getAppUrl } from '../../../../lib/net/router'
import { useAppSelector } from '../../../../hooks/useAppSelector'
import { useAppDispatch } from '../../../../hooks/useAppDispatch'
import useElementSize from '../../../../hooks/useElementSize'
import { PaginationParams, RTKPage } from '../../../../store/types/api'
import Card from '../../../layout/Card'
import Icon from '../../../typography/Icon'
import Button from '../../../interaction/Button'
import H5 from '../../../typography/H5'
import { librarySelectors } from '../../../../store/slices/library'

import i18n from '../i18n'

type VirtualProps = {
  virtualViewName: string,
  className?: string | string[],
  toolbarName?: string,
  gap?: number,
  data: {
    pages: RTKPage[],
    pageParams: PaginationParams[],
  },
  getItem: (data: Record<string, unknown>) => ReactNode,
  isSuccess: boolean,
  isLoading: boolean,
  itemHeight: number,
  itemWidth: number | '100%',
  scrollRestorationKey?: string,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  fetchNextPage: () => void,
  fetchPreviousPage: () => void,
  isFetchingNextPage: boolean,
  isFetchingPreviousPage: boolean,
  emptyTitle?: string,
  emptyMessage?: string,
  emptyButton?: boolean | React.ReactNode,
}

/**
 * Determine how many items go in each row for the current screen size.
 */
const calcItemsPerRow = (boxWidth, itemWidth): number => {
  if (itemWidth === '100%') {
    return 1
  } else {
    // Expect a numeric value if not `100%`
    return Math.floor(boxWidth / (itemWidth + 20)) || 1
  }
}

/**
 * When paired with RTK infinite scroll queries, this implements bidirectional
 * virtualized scrolling.
 */
function VirtualLayout({
  virtualViewName,
  className,
  data,
  getItem,
  gap = 20,
  isSuccess,
  isLoading,
  itemHeight,
  itemWidth,
  hasNextPage,
  hasPreviousPage,
  fetchNextPage,
  fetchPreviousPage,
  isFetchingNextPage,
  isFetchingPreviousPage,
  emptyTitle,
  emptyMessage,
  emptyButton,
  ...props
}: PropsWithChildren<VirtualProps>) {
  const dispatch = useAppDispatch()
  const libraries = useAppSelector(librarySelectors.current)
  const boxRef = useRef(null)
  const { width: boxWidth } = useElementSize(boxRef)
  const parentRef = useRef<HTMLDivElement>(null)
  const { [virtualViewName]: virtualView } = useAppSelector(layoutSelectors.virtualViews)
  const [initialOffset] = useState(virtualView?.offset || 0)
  const [itemsPerRow, setItemsPerRow] = useState(calcItemsPerRow(boxWidth, itemWidth))

  const { pages = [], pageParams = [] } = data || {}
  const cachedRTKData = pages.flatMap((res) => res[0])
  const totalItems = pages?.[0]?.[1] || 0
  const leadingPageParams = pageParams[pageParams.length - 1]
  const trailingPageParams = pageParams[0]
  const numRows = Math.ceil(totalItems / itemsPerRow)

  /**
   * Cache the virtual position for reinitialization on page reload.
   */
  const onVirtualChange = (startRow, endRow, offset) => {
    const start = startRow - 1 <= 0 ? 1 : ((startRow - 1) * itemsPerRow) + 1
    const end = Math.min(((endRow) * itemsPerRow), totalItems)
    dispatch(layoutActions.setVirtualView({
      name: virtualViewName,
      value: {
        start,
        end,
        offset,
        total: totalItems,
      },
    }))
  }

  /**
   * Gets the items for a single row.
   */
  const getRowItems = (rowIndex: number) => {
    // One item per row
    if (itemsPerRow === 1) {
      return getItem(cachedRTKData[rowIndex - trailingPageParams.skip])
    }

    // Multiple items per row
    const startIndex = (rowIndex * itemsPerRow) - trailingPageParams.skip
    const endIndex = Math.min(startIndex + itemsPerRow, cachedRTKData.length)
    const rowItems = cachedRTKData.slice(startIndex, endIndex)
    return rowItems.map((data) => getItem(data))
  }

  const rowVirtualizer = useVirtualizer({
    count: numRows,
    estimateSize: () => itemHeight,
    getScrollElement: () => parentRef.current,
    overscan: 4,
    gap,
    paddingStart: 120,
    paddingEnd: 20,
    onChange: (instance) => onVirtualChange(
      instance?.range?.startIndex + 1,
      instance?.range?.endIndex + 1,
      instance.scrollOffset,
    ),
  })

  /**
   * As the user scrolls, keep just enough query data in memory to render the
   * virtual rows. This keeps only +1 page of overflow data in memory in each
   * direction.
   * 
   * For the first load to work correctly, the RTK query must correctly
   * reinitialize itself using its cached state.
   */
  useEffect(() => {
    const virtualItems = [...rowVirtualizer.getVirtualItems()]
    const firstItem = virtualItems[0]
    const lastItem = virtualItems[virtualItems.length - 1]

    if (!firstItem || virtualItems.length >= totalItems) {
      return
    }

    const offset = 0
    const nextPageTrigger = Math.floor((leadingPageParams.skip - offset) / itemsPerRow)
    const prevPageTrigger = Math.floor((trailingPageParams.skip + offset) / itemsPerRow)

    if (
      lastItem.index > nextPageTrigger
      && hasNextPage
      && !isFetchingNextPage
    ) {
      fetchNextPage()
    }

    if (
      firstItem.index < prevPageTrigger
      && hasPreviousPage
      && !isFetchingPreviousPage
    ) {
      fetchPreviousPage()
    }
  }, [
    hasNextPage,
    hasPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    cachedRTKData.length,
    rowVirtualizer.getVirtualItems(),
  ])

  /**
   * Set initial offset after the RTK query has loaded.
   */
  useLayoutEffect(() => {
    setTimeout(() => {
      rowVirtualizer.scrollToOffset(initialOffset)
    }, 20)
  }, [isSuccess])

  /**
   * Update the items per row when the width is resized.
   */
  useEffect(() => {
    setItemsPerRow(calcItemsPerRow(boxWidth, itemWidth))
  }, [boxWidth])

  /**
   * Trigger a rerender when the number of items per row changes.
   */
  useEffect(() => {
    rowVirtualizer.measure()
  }, [itemsPerRow])

  /**
   * Trigger a rerender when libraries change.
   */
  useEffect(() => {
    rowVirtualizer.measure()
  }, [libraries.toString(), numRows])

  return (
    <div {...props} className={clsx('virtual-layout', className)}>
      {isLoading && <div className="virtual-loading"><Loading /></div>}
      {isSuccess && totalItems === 0 && (
        <div className="virtual-empty">
          <Card
            border={0}
            shadow={1}
            bg={1}
            header={<Icon fa="fas fa-info-circle" hoverType={null} />}
            footer={!!emptyButton && (
              <Button href={getAppUrl('indexing', { app: 'admin' })} solid={true}>
                {i18n['virtual.empty.button']['en']}
              </Button>
            )}
          >
            <>
              <H5>{emptyTitle || i18n['virtual.empty.title']['en']}</H5>
              <p dangerouslySetInnerHTML={{ __html: emptyMessage || i18n['virtual.empty.desc']['en'] }} />
            </>
          </Card>
        </div>
      )}
      <div
        ref={parentRef}
        className={clsx('virtual-root')}
        style={{
          width: '100%',
          overflow: 'auto',
          position: 'relative',
        }}>
        <div
          ref={boxRef}
          className="virtual-box"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {
            data
            && !!cachedRTKData?.length
            && rowVirtualizer.getVirtualItems().map((virtualRow) => {
              return (
                <div
                  ref={rowVirtualizer.measureElement}
                  key={virtualRow.index}
                  className="virtual-row"
                  data-row-index={virtualRow.index}
                  data-index={virtualRow.index}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {getRowItems(virtualRow.index)}
                </div>
              )
            },
          )}
        </div>
      </div>
    </div>
  )
}

export default VirtualLayout
