import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import {
  List,
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
} from 'react-virtualized'
import { motion } from 'framer-motion'

import Toolbar from '@cardinalapps/ui/src/components/interaction/Toolbar'

import VirtualPhotoListImage from './thumbs/Image'
import MissingImage, { MISSING_IMAGE_WIDTH } from './thumbs/MissingImage'

import { layoutSelectors } from '@cardinalapps/ui/src/store/slices/layout'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import usePhoto from '@cardinalapps/ui/src/hooks/usePhoto'
import useWindowSize from '@cardinalapps/ui/src/hooks/useWindowSize'

import queryParams from '@cardinalapps/ui/src/lib/net/queryParams'

import i18n from './i18n.json'

import './styles.css'
import { ToolbarItem } from '@cardinalapps/ui/src/components/interaction/Toolbar/types'

const ROW_HEIGHT = 210
const QUERY_PARAM_CURRENT_ROW = 'r'
const QUERY_PARAM_CURRENT_PHOTOVIEWER = 'p'

const cellMeasureCache = new CellMeasurerCache({
  defaultHeight: ROW_HEIGHT,
  fixedHeight: false,
  fixedWidth: true,
})

const toolbarDefaults = {
  take: 1000000,
  skip: 0,
  order: 'desc',
}

/**
 * Given the entire set of photos, slice it up into rows for virtual scrolling.
 * 
 * This could be a server-side feature for ultra maximum scalability.
 */
const createRows = (photos = [], listWidth) => {
  if (!Array.isArray(photos)) {
    console.error('Invalid photos format')
    return []
  }

  const takenOnDays = photos.map((photo) => photo.takenOnDay)

  // Add helpful tags to the photos
  photos.forEach((photo, i) => {
    // Tag each photo with its global index
    photo.globalIndex = i

    const prevPhoto = photos[i-1]
    if (
      !prevPhoto
      || (prevPhoto && prevPhoto?.takenOnDay !== photo?.takenOnDay)
    ) {
      // Tag the photos that are the first photo of a new day...
      photo.isFirstInDateRange = true
      // ...and tag them with the number of photos taken that day
      photo.numPhotosInDateRange = takenOnDays.filter((day) => day === photo.takenOnDay).length
    }
  })

  const split = []
  const lastRow = () => split[split.length - 1]
  const addRow = () => split.push({ title: '', photos: [] })
  const addPhotoToLastRow = (photo) => lastRow().photos.push(photo)

  // Split into rows, where each row has as many photos as possible without
  // breaking to the next line
  photos.forEach((photo) => {
    // Add first photo
    if (!lastRow()) {
      addRow()
      addPhotoToLastRow(photo)
      return
    }

    if (listWidth >= 500) {
      // FIXME refactor all this
      const hasThumbnail = false
      const usedSpaceInLastRow = lastRow().photos.reduce((sum, cur) => {
        const imageWidth = hasThumbnail
          ? Number(cur?.thumbnail?.find((thumb) => thumb.size === 'small_nocrop')?.width)
          : MISSING_IMAGE_WIDTH
        return Number(sum) + imageWidth + 10 // include margin
      }, 0)
      const magic = listWidth <= 768 ? 0 : 0 // Magic number to make it look nice with the timeline bar
      const availableSpaceInLastRow = listWidth - usedSpaceInLastRow - magic
      const thumbWidth = hasThumbnail
        ? photo?.thumbnail?.find((thumb) => thumb.size === 'small_nocrop')?.width
        : MISSING_IMAGE_WIDTH

      // Add row if there is no more room in last row
      if (thumbWidth >= availableSpaceInLastRow) {
        addRow()
      }
      // Add row if the next group of photos is 6 or more
      else if (photo.numPhotosInDateRange >= 6) {
        addRow()
      }

      addPhotoToLastRow(photo)
    }
    // Fill rows for mobile devices, we want two photos per row
    else {
      if (lastRow().photos.length === 2) {
        addRow()
      }
      addPhotoToLastRow(photo)
    }
  })

  const rows = Array.from(Object.values(split))

  return rows
}

type VirtualPhotoListProps = {
  data: unknown[],
  showToolbar?: boolean,
  listClassName?: string,
}

/**
 * The archive page fetches photos manually instead of using RTK Query because
 * the data is too large to be stored in localstorage.
 */
function VirtualPhotoList({
  data,
  showToolbar = true,
  listClassName,
}: VirtualPhotoListProps) {
  // const dispatch = useDispatch()
  const navigate = useNavigate()
  const { fetchPhoto, photoError } = usePhoto()
  const timeBarRef = useRef(null)
  const timeBarInnerRef = useRef(null)
  const listRef = useRef(null)
  //const lastUrlUpdateAt = useRef(null)
  const [lastUrlUpdateAt, setLastUrlUpdateAt] = useState(Date.now())
  const sidebarMode = useSelector(layoutSelectors.sidebarMode)
  const { lang } = useSelector(settingsSelectors.current)
  const windowSize = useWindowSize()
  const [allRows, setAllRows] = useState([])
  const [yearIndexes, setYearIndexes] = useState({})
  const [timeBarCurrentLocation, setTimeBarCurrentLocation] = useState(0)
  const [timeBarCurrentLocationYear, setTimeBarCurrentLocationYear] = useState()
  const [timeBarYearOffsets, setTimeBarYearOffsets] = useState({})
  const [currentTopRowIndexInView, setCurrentTopRowIndexInView] = useState()
  const [currentTopRowInView, setCurrentTopRowInView] = useState()
  const [currentBottomRowIndexInView, setCurrentBottomRowIndexInView] = useState()
  const [currentBottomRowInView, setCurrentBottomRowInView] = useState()
  const [currentArchiveHeight, setCurrentArchiveHeight] = useState()
  const [photoViewerPhotos, setPhotoViewerPhotos] = useState([])
  const [scrollPositionRestored, setScrollPositionRestored] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [toolbarShifted, setToolbarShifted] = useState(false)
  //const [focusedPhoto, setFocusedPhoto] = useState()

  /**
   * (Re)render all virutal rows in the viewport.
   */
  const draw = () => {
    setAllRows(createRows(data, listRef.current.props.width))
  }

  /**
   * Draw and clear cache.
   */
  const redraw = () => {
    draw()
    cellMeasureCache.clearAll()
    listRef.current.recomputeRowHeights()
    listRef.current.forceUpdateGrid()
  }

  /**
   * Returns the row index that contains the given photo ID.
   */
  const findRowByPhotoId = (photoId) => {
    let foundRow = 0

    // Find the row with the photo we want
    if (photoId) {
      allRows.forEach((row, rowIndex) => {
        row.photos.forEach((photo) => {
          if (photo.photoId === photoId) {
            foundRow = rowIndex
          }
        })
      })
    }

    return foundRow
  }

  /**
   * Handles clicks of the time bar.
   */
  const handleTimeBarClick = (e) => {
    const timeBarBox = timeBarRef.current?.getBoundingClientRect()
    const { pageY: clickY } = e
    const distanceFromTop = Math.abs(timeBarBox.top - clickY)
    const percentageFromTop = (distanceFromTop / timeBarBox.height) * 100
    const listHeight = document.querySelector('.virtual-list-photos-archive > div[role="rowgroup"]')?.clientHeight || 1

    let newScrollTop

    if (percentageFromTop <= 1) {
      newScrollTop = 0
    } else if (percentageFromTop >= 99) {
      newScrollTop = listHeight
    } else {
      newScrollTop = (percentageFromTop / 100) * listHeight
    }

    listRef.current?.scrollToPosition(newScrollTop)
  }

  /**
   * Update the URL with the current scroll position a maximum of once per x
   * milliseconds.
   */
  const throttledUpdateUrlWithCurrentPosition = () => {
    if (Date.now() >= lastUrlUpdateAt + 50) {
      // The scrollPositionRestored state is used to prevent janky initial page
      // loading when restoring the scroll position, since restoring the
      // position triggers scroll handlers too.
      if (currentTopRowIndexInView !== 0) {
        // @ts-expect-error type this
        navigate(queryParams('', { [QUERY_PARAM_CURRENT_ROW]: currentTopRowInView.photos?.[0].photoId }), { replace: true })
        setTimeout(() => {
          setScrollPositionRestored(true)
        }, 500)
      } else if (currentTopRowIndexInView === 0) {
        if (scrollPositionRestored) {
          navigate('/', { replace: true })
        }
      }

      setLastUrlUpdateAt(Date.now())
    }
  }

  /**
   * Update the location of the year in the time bar.
   */
  const updateTimebarLocation = (scrollHeight, scrollTop) => {
    if (!timeBarRef.current) return

    const percentageScrolled = (scrollTop / scrollHeight) * 100
    setTimeBarCurrentLocation(percentageScrolled)

    if (currentTopRowInView) {
      // @ts-expect-error type this
      setTimeBarCurrentLocationYear(currentTopRowInView.photos?.[0].takenOnDay.split(' ').pop())
    }
  }

  /**
   * Scroll callback handler.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleScroll = ({ clientHeight, scrollHeight, scrollTop }) => {
    updateTimebarLocation(scrollHeight, scrollTop)
    setToolbarShifted(!!scrollTop)
    if (scrollTop > 0) {
      throttledUpdateUrlWithCurrentPosition()
    }
  }

  /**
   * Whenever new rows are rendered.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRowsRendered = ({ overscanStartIndex, overscanStopIndex, startIndex, stopIndex }) => {
    setCurrentTopRowIndexInView(startIndex)
    setCurrentTopRowInView(allRows[startIndex])
    setCurrentBottomRowIndexInView(stopIndex)
    setCurrentBottomRowInView(allRows[stopIndex])
  }

  /**
   * Handle window resize, as per the docs.
   */
  const handleViewportResize = () => {
    if (listRef.current) {
      cellMeasureCache.clearAll()
      listRef.current.recomputeRowHeights()
      listRef.current.forceUpdateGrid()
    }
  }

  /**
   * Reads the dates in all rows to determine when each year starts.
   */
  const computeYearIndexes = () => {
    const found = {}

    allRows.forEach((row, i) => {
      const year = row.photos[0]?.takenOnDay?.split(' ').pop()
      if (!Object.prototype.hasOwnProperty.call(found, year)) {
        found[year] = i
      }
    })

    setYearIndexes(found)
  }

  /**
   * Calculates the offsets of each year in the timeline.
   */
  const computeTimeBarYearOffsets = () => {
    if (!timeBarRef.current) return

    const offsets = {}

    // This assumes that all rows have the same height
    Object.keys(yearIndexes).forEach((year) => {
      const startsAtRowIndex = yearIndexes[year]
      const timeBarPercentage = (startsAtRowIndex / allRows.length) * 100
      offsets[year] = timeBarPercentage
    })

    setTimeBarYearOffsets(offsets)
  }

  const handlePhotoSelected = (id) => {
    if (!selectedPhotos.includes(id)) {
      setSelectedPhotos([...selectedPhotos, id])
    }
  }

  const handlePhotoDeselected = (id) => {
    if (selectedPhotos.includes(id)) {
      selectedPhotos.splice(selectedPhotos.indexOf(id), 1)
      setSelectedPhotos([...selectedPhotos])
    }
  }

  const clearSelectedPhotos = () => {
    setSelectedPhotos([])
  }

  /**
   * Renders a single row in the virtual list.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rowRenderer = ({ index, isScrolling, key, parent, style }) => {
    const row = allRows?.[index]
    //const loadedPhotos = []
    const noDatesInThisRow = row.photos.every((photo) => !photo?.isFirstInDateRange)
    return (
      <CellMeasurer
        cache={cellMeasureCache}
        columnIndex={0}
        key={key}
        parent={parent}
        rowIndex={index}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
        {({ measure, registerChild }) => (
          <div className={clsx('row', index === allRows.length - 1 && 'lastRow')} ref={registerChild} style={style}>
            <div className={clsx('rowInner', !!noDatesInThisRow && 'noDatesInThisRow')} data-index={index}>
              {row.photos.map((photo, photoIndex) => {
                const hasThumbnail = photo?.thumbnail?.length
                const photoViewerProps = {
                  photos: photoViewerPhotos,
                  initialPhotoIndex: photo?.globalIndex,
                  mapIconImagePath: '/photos/icons/marker.png',
                  onOpenExternalMap: () => console.log(''),
                  photoErrorMessage: photoError?.message,
                  onImageLoad: async (photoSrc, photoEntity) => {
                    const url = new URL(window.location.href)
                    // Set both args to the current photo the user is
                    // looking at, so that we can restore the archive no
                    // matter how far they drift in the viewer
                    url.searchParams.set(QUERY_PARAM_CURRENT_ROW, photoEntity.photoId)
                    url.searchParams.set(QUERY_PARAM_CURRENT_PHOTOVIEWER, photoEntity.photoId)
                    navigate(url.search, { replace: true })
                  },
                  onClose: () => {
                    const url = new URL(window.location.href)
                    const rowToRestore = findRowByPhotoId(url.searchParams.get(QUERY_PARAM_CURRENT_ROW))
                    //const closedPhotoId = url.searchParams.get(QUERY_PARAM_CURRENT_PHOTOVIEWER)
                    url.searchParams.delete(QUERY_PARAM_CURRENT_PHOTOVIEWER)
                    // @ts-expect-error type this
                    if (rowToRestore > currentBottomRowIndexInView || rowToRestore < currentTopRowIndexInView) {
                      listRef.current.scrollToRow(rowToRestore)
                    }
                    //setFocusedPhoto(closedPhotoId)
                    navigate(url.search, { replace: true })
                  },
                }
                return (
                  <div
                    key={photoIndex}
                    className={clsx(
                      'thumbBox',
                      !!photo?.isFirstInDateRange && 'dateRangeStart',
                    )}
                    data-photo-id={photo.photoId}
                  >
                    {
                      photo?.isFirstInDateRange
                        ? <p
                            className={clsx('day', photo?.numPhotosInDateRange >= 2 && 'noTruncate')}
                            title={
                              photo.numPhotosInDateRange === 1
                                ? i18n['num-photos-in-range'][lang].replace('{num}', photo.numPhotosInDateRange).replace('{date}', photo.takenOnDay)
                                : i18n['num-photos-in-range-plural'][lang].replace('{num}', photo.numPhotosInDateRange).replace('{date}', photo.takenOnDay)
                            }
                          >
                            {photo.takenOnDay} <span className={'numInRange'}>{photo.numPhotosInDateRange}</span>
                          </p>
                        : null
                    }
                    {/* For best results, keep the row height the same as the natural thumbnail height */}
                    {hasThumbnail
                      ? <VirtualPhotoListImage
                          photo={photo}
                          //photoViewerPhotos={photoViewerPhotos}
                          selectedPhotos={selectedPhotos}
                          //photoError={photoError}
                          //findRowByPhotoId={findRowByPhotoId}
                          handlePhotoSelected={handlePhotoSelected}
                          handlePhotoDeselected={handlePhotoDeselected}
                          photoViewerProps={photoViewerProps}
                          //listRef={listRef}
                        />
                      : <MissingImage
                          photo={photo}
                          //photoViewerPhotos={photoViewerPhotos}
                          selectedPhotos={selectedPhotos}
                          //photoError={photoError}
                          //findRowByPhotoId={findRowByPhotoId}
                          handlePhotoSelected={handlePhotoSelected}
                          handlePhotoDeselected={handlePhotoDeselected}
                          photoViewerProps={photoViewerProps}
                          //listRef={listRef}
                        />
                    }
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CellMeasurer>
    )
  }

  /**
   * Unfocus the selected highlighted photo on click.
   * 
   * TODO Uncomment this when the <Thumb /> has better support for focus states.
   */
  // useEffect(() => {
  //   if (focusedPhoto) {
  //     setTimeout(() => {
  //       document.querySelector(`[data-photo-id="${focusedPhoto}"]`)?.focus()
  //     }, 0)
  //   }
  // }, [focusedPhoto])

  /**
   * Recompute the layout on window resize.
   */
  useEffect(() => {
    window.addEventListener('resize', handleViewportResize)
    return () => window.removeEventListener('resize', handleViewportResize)
  }, [])

  /**
   * Transform the photos into rows for virtual scrolling.
   */
  useEffect(() => {
    if (listRef.current && listRef.current.props.width) {
      draw()
    }
  }, [data, windowSize, listRef.current])

  /**
   * Calculate year offsets when we get new rows.
   */
  useEffect(() => {
    computeYearIndexes()
  }, [allRows])

  /**
   * Define the PhotoViewer array.
   */
  useEffect(() => {
    // @ts-expect-error type this
    setPhotoViewerPhotos(data.map((photo) => () => fetchPhoto(photo.id)))
  }, [data])

  /**
   * Compute year offsets when new data is loaded. This is required because the
   * rows have varying heights.
   */
  useEffect(() => {
    computeTimeBarYearOffsets()
    // @ts-expect-error type this
    setCurrentArchiveHeight(document.querySelector('.virtual-list-photos-archive > div[role="rowgroup"]')?.clientHeight || 0)
  }, [currentTopRowInView, currentBottomRowInView, currentArchiveHeight])

  /**
   * Redraw when the user expands/collapses the sidebar.
   */
  useEffect(() => {
    if (listRef.current) {
      setTimeout(() => {
        redraw()
      }, 300)
    }
  }, [sidebarMode])

  /**
   * Restore scroll position on load.
   *
   * As the user scrolls, the first photo ID of the top row is saved in the URL.
   */
  useEffect(() => {
    if (!listRef.current) return

    const url = new URL(window.location.href)
    const rememberedPhoto = url.searchParams.get(QUERY_PARAM_CURRENT_ROW)
    const rowToRestore = findRowByPhotoId(rememberedPhoto)

    listRef.current.scrollToRow(rowToRestore)
  }, [allRows])

  /**
   * Catch when the current URL params are removed, and scroll to the top. This
   * happens when the user clicks the logo or the current menu item.
   */
  useEffect(() => {
    if (!listRef.current) return

    if (!window.location.search && currentTopRowIndexInView !== 0) {
      listRef.current.scrollToRow(0)
    }
  }, [window.location.search])

  return (
    <>
      {!!showToolbar &&
        <div className={clsx('toolbarRow')}>
          {!!data.length &&
            <motion.div
              className={'toolbarMotion'}
              animate={toolbarShifted
                ? { left: '50%', transform: 'translateX(-50%)', transition: { type: 'spring', mass: 0.4 } }
                : { left: '0%', transform: 'translateX(0%)', transition: { type: 'spring', mass: 0.4 } }
              }
            >
              {/* FIXME toolbar state has moved to the store */}
              <Toolbar
                className={clsx(toolbar, toolbarShifted && 'shift')}
                items={[
                  {
                    slug: 'order',
                    initialValue: toolbarDefaults.order,
                    render: ToolbarItem.ORDER,
                  },
                  {
                    slug: ToolbarItem.RESET,
                    render: ToolbarItem.RESET,
                    extra: { onReset: () => clearSelectedPhotos() },
                  },
                  {
                    slug: ToolbarItem.SELECTION,
                    render: ToolbarItem.SELECTION,
                    extra: { onClearSelection: () => clearSelectedPhotos() },
                  },
                ]}
                numArchiveItems={data.length}
                numItemsSelected={selectedPhotos.length}
              />
            </motion.div>
          }
        </div>
      }
      <nav
        ref={timeBarRef}
        className={'timeBar'}
        onClick={handleTimeBarClick}
      >
        <div className={'bg'}></div>
        <div ref={timeBarInnerRef} className={'timeBarInner'}>
          <motion.div
            // drag="y"
            // onDragStart={() => setTimeBarIsDragging(true)}
            // onDragEnd={() => setTimeBarIsDragging(false)}
            className={'currentLocation'}
            style={{ top: timeBarCurrentLocation + '%' || 0 }}
          >
            {timeBarCurrentLocationYear || allRows?.[0]?.photos?.[0]?.takenOnDay?.split(' ')?.pop()}
          </motion.div>
          <div className={'timeline'}>
            <div>
              {Object.keys(timeBarYearOffsets).map((year) => {
                return (
                  <div
                    key={year}
                    className={'year'}
                    style={{ top: `${timeBarYearOffsets[year]}%` }}
                  >
                    <span className={'over'}>{year}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </nav>
      <AutoSizer className={'sizer'}>
        {({ width, height }) => (
          <List
            ref={(ref) => listRef.current = ref }
            className={clsx('virtual-list', `virtual-list-${'photos-archive'}`, listClassName)}
            width={width || 0}
            height={height || 0}
            //deferredMeasurementCache={cellMeasureCache}
            //rowHeight={cellMeasureCache.rowHeight}
            rowHeight={ROW_HEIGHT}
            estimatedRowSize={ROW_HEIGHT * allRows.length}
            rowCount={allRows.length}
            rowRenderer={rowRenderer}
            onRowsRendered={handleRowsRendered}
            onScroll={handleScroll}
          />
        )}
      </AutoSizer>
    </>
  )
}

export default VirtualPhotoList
