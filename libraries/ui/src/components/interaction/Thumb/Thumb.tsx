import { useRef, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import clsx from 'clsx'

import SelectContent from '../SelectContent'
import PhotoViewer from '../../features/PhotoViewer'
import type{ PhotoViewerProps } from '../../features/PhotoViewer/PhotoViewer'
import Loading from '../../layout/Loading'

import { toastActions } from '../../../store/slices/toast'
import { settingsSelectors } from '../../../store/slices/settings'

import { useIntersectionObserver } from '../../../hooks/useIntersectionObserver'

import i18n from './i18n'

import './Thumb.css'

type ThumbProps = {
  className?: string,
  src?: string,
  w?: string,
  h?: string,
  peek?: boolean,
  peekImage?: string,
  peekScale?: number,
  peekDelay?: number,
  peekTopMax?: number,
  peekLeftMax?: number,
  peekRightMax?: number,
  peekBottomMax?: number,
  lazyLoad?: boolean,
  onMouseEnter?: () => void,
  onThumbnailImageLoaded?: () => void,
  onPeekImageLoaded?: () => void,
  photoViewerInitiallyOpen?: boolean,
  photoViewerProps?: PhotoViewerProps,
  selectable?: boolean,
  selected?: boolean,
  onSelect?: () => void,
  onDeselect?: () => void,
  forceShowSelect?: boolean,
}

/**
 * Thumb
 *
 * @param src - Static path to the thumbnail image, or image object.
 * @param peek - Enable or disaled the peek feature.
 * @param peekSrc - Static path to the peek image. Not necessary is `src`
 * is an image object.
 */
const Thumb = ({
  className,
  src,
  w,
  h,
  peek = true,
  peekImage,
  peekDelay = 500,
  peekScale = 2.5,
  peekTopMax = 20,
  peekLeftMax = 20,
  peekRightMax = window?.innerWidth - 20,
  peekBottomMax = window?.innerHeight - 20,
  lazyLoad = true,
  onMouseEnter,
  onThumbnailImageLoaded = () => {},
  onPeekImageLoaded = () => {},
  photoViewerInitiallyOpen = false,
  photoViewerProps = { photos: [] },
  selectable = false,
  selected = false,
  forceShowSelect = false,
  onSelect = () => {},
  onDeselect = () => {},
  children,
}: PropsWithChildren<ThumbProps>) => {
  const dispatch = useDispatch()
  const lastMb1TimestampRef = useRef(null)
  const photoRef = useRef(null)
  const peekHoldTimerRef = useRef(null)
  const { lang } = useSelector(settingsSelectors.current)
  const isIntersecting = useIntersectionObserver(photoRef)
  const [isHovering, setIsHovering] = useState(false)
  const [peekIsLoading, setPeekIsLoading] = useState(false)
  const [peekContentIsHovered, setPeekContentIsHovered] = useState(false)
  const [peekIsOpen, setPeekIsOpen] = useState(false)
  const [peekAdjustmentX, setPeekAdjustmentX] = useState(0)
  const [peekAdjustmentY, setPeekAdjustmentY] = useState(0)
  const [isOpenInViewer, setIsOpenInViewer] = useState(false)

  // Displaying the larger image is controlled independently of the animation to
  // allow for a smoother loading experience
  const [renderPeekImage, setRenderPeekImage] = useState(false)

  const baseThumbStyles = {
    width: w || 'auto',
    height: h || 'auto',
    transform: peekIsOpen ? `translateX(${peekAdjustmentX}px) translateY(${peekAdjustmentY}px) scale(${peekScale})` : undefined,
  }

  /**
   * Load the larger thumbnail.
   */
  const loadPeek = () => {
    setPeekIsLoading(true)
  }

  /**
   * Close the larger thumbnail.
   */
  const closePeek = () => {
    if (peekHoldTimerRef.current) {
      clearTimeout(peekHoldTimerRef.current)
      peekHoldTimerRef.current = null
    }
    setPeekIsLoading(false)
    setPeekIsOpen(false)
    setRenderPeekImage(false)
    setPeekContentIsHovered(false)
  }

  /**
   * When the small thumbnail is loaded.
   */
  const handleThumbnailLoaded = () => {
    onThumbnailImageLoaded()
  }

  /**
   * When the larger thumbnail is loaded.
   */
  const handlePeekImageLoaded = () => {
    setPeekIsLoading(false)
    setPeekIsOpen(true)
    setRenderPeekImage(true)
    onPeekImageLoaded()
  }

  /**
   * On mouse enter.
   */
  const handleMouseEnter = () => {
    setIsHovering(true)
    onMouseEnter?.()
  }

  /**
   * On mouse leave.
   */
  const handleMouseLeave = () => {
    setIsHovering(false)
    closePeek()
  }

  /**
   * When the image is selected.
   */
  const handleSelect = () => {
    onSelect?.()
  }

  /**
   * When the image is unselected.
   */
  const handleDeselect = () => {
    onDeselect?.()
  }

  /**
   * Maybe open photo viewer on init.
   */
  useEffect(() => {
    if (photoViewerInitiallyOpen) {
      setIsOpenInViewer(true)
    }
  }, [])

  /**
   * Calculate peek dimensions when peek is triggered.
   */
  useEffect(() => {
    const photoRect = photoRef.current?.getBoundingClientRect() || {}
    const peekWidth = photoRect.width * peekScale
    const peekHeight = photoRect.height * peekScale
    const peekWidthDifference = peekWidth - photoRect.width
    const peekHeightDifference = peekHeight - photoRect.height
    const peekTop = photoRect.top - (peekHeightDifference / 2 - 40)
    const peekLeft = photoRect.left - (peekWidthDifference / 2 - 40)
    const peekRight = photoRect.right + (peekWidthDifference / 2 + 40)
    const peekBottom = photoRect.bottom + (peekHeightDifference / 2 + 40)

    let peekAdjustmentY = 0
    let peekAdjustmentX = 0

    if (peekTop < peekTopMax) {
      peekAdjustmentY = peekTopMax - peekTop
    } else if (peekBottom > peekBottomMax) {
      peekAdjustmentY = -Math.abs((peekBottom - peekBottomMax) - 80)
    }

    if (peekLeft < peekLeftMax) {
      peekAdjustmentX = peekLeftMax - peekLeft
    } else if (peekRight > peekRightMax) {
      peekAdjustmentX = -Math.abs((peekRight - peekRightMax) - 80)
    }

    setPeekAdjustmentY(peekAdjustmentY)
    setPeekAdjustmentX(peekAdjustmentX)
  }, [peekIsOpen])

  return (
    <div
      className={clsx(
        'thumb',
        className,
        peek && 'peek-enabled',
        peekIsOpen && 'peek-open',
        peekIsLoading && 'peek-loading',
        renderPeekImage && 'render-peek',
        selected && 'selected',
      )}
      ref={photoRef}
      style={baseThumbStyles}
      onMouseDown={(e) => {
        if (isOpenInViewer) return
        if (e.button !== 0) return
        if ((e.target as HTMLElement).matches('button') || (e.target as HTMLElement).closest('button')) return
        lastMb1TimestampRef.current = Date.now()
        if (peek) {
          // User has to hold mb1 down to open peek
          peekHoldTimerRef.current = setTimeout(() => {
            loadPeek()
          }, peekDelay)
        }
      }}
      onMouseUp={(e) => {
        if (e.button === 0) {
          // This is a regular left click
          if (Date.now() - lastMb1TimestampRef.current <= peekDelay) {
            setIsOpenInViewer(true)
          }
          closePeek()
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={clsx('image')}>
        <div className="peek-layer">
          {renderPeekImage && children && (
            <motion.div
              className={clsx('peek-content', 'glass', peekContentIsHovered && 'hide')}
              initial={{ opacity: 0, translateX: 3 }}
              animate={{ opacity: 1, translateX: 0, transition: { delay: 0.2, duration: 0.5 } }}
              onMouseEnter={() => setPeekContentIsHovered(true)}
              onMouseLeave={() => setPeekContentIsHovered(false)}
            >
              {children}
            </motion.div>
          )}
        </div>
        {/* Thumbnail image */}
        {(!lazyLoad || !!isIntersecting) &&
          <motion.div
            className="small-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <SelectContent
              show={selectable && !peekIsOpen && (forceShowSelect || isHovering || selected)}
              selected={selected}
              onSelect={handleSelect}
              onDeselect={handleDeselect}
            >
              <img className={clsx('small')} src={src} onLoad={handleThumbnailLoaded} />
            </SelectContent>
          </motion.div>
        }
        {/* Peek image */}
        {peek && (peekIsLoading || peekIsOpen) &&
          <img
            className={clsx('peek')}
            src={peekImage}
            onLoad={handlePeekImageLoaded}
            onError={() => dispatch(toastActions.addToQueue({
              type: 'danger',
              title: i18n['image-load-error']?.[lang],
              ttl: 3000,
            }))}
          />
        }
        {isOpenInViewer && photoViewerProps.photos?.length &&
          <PhotoViewer
            {...photoViewerProps}
            photos={photoViewerProps.photos}
            onClose={() => {
              setIsOpenInViewer(false)
              photoViewerProps?.onClose?.()
            }}
            usePortal={true}
          />
        }
      </div>
      <Loading color='#fff' />
    </div>
  )
}

export default Thumb
