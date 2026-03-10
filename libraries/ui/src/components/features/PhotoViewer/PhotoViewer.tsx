import { useState, useEffect, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import zoomer from 'vanilla-js-wheel-zoom'
import { v4 } from 'uuid'
import clsx from 'clsx'

import Loading from '../../layout/Loading'

import { settingsSelectors } from '../../../store/slices/settings'
import { toastActions } from '../../../store/slices/toast'
import type { PhotoMetadataPair } from './utils/formatMetadata'

import PhotoViewerSidebar from './PhotoViewerSidebar'

import i18n from './i18n'

import './PhotoViewer.css'

const SIDEBAR_WIDTH = 450

export type PhotoThumbnail = {
  size: string,
  relativeSrc: string,
  width: number,
}

export type PhotoUrl = string
export type PhotoObject = {
  src: string,
  entity: Record<string, unknown>,
  thumbnail: PhotoThumbnail[],
  takenAt: string,
  photoId: string,
  id: number,
}
export type PhotoFunction =
  Promise<PhotoUrl | PhotoObject>
  | (() => PhotoUrl | PhotoObject)
  | Promise<() => PhotoUrl | PhotoObject>

export type PhotoType = PhotoUrl | PhotoObject | PhotoFunction
export type Photos = PhotoType[]

export type PhotoEntity = {
  photoId: number,
  width: number,
  height: number,
  file: {
    relativePath: string,
    absolutePath: string,
    extension: string,
  },
  takenAt: string,
  metadata: PhotoMetadataPair[],
  gpsLat: number,
  gpsLng: number,
  photoAlbumEntries: Array<{
    photoAlbum: { id: number },
  }>,
}

export type PhotoViewerProps = {
  photos: Photos,
  initialPhotoIndex?: number,
  onNext?: (index: number) => void,
  onPrev?: (index: number) => void,
  onClose?: () => void,
  onImageLoad?: (img, entity) => void,
  onImageError?: (img, entity, ...other) => void,
  onOpenExternalMap?: () => void,
  mapIconImagePath?: string,
  usePortal?: boolean,
  photoErrorMessage?: string,
}

/**
 * Photo viewer.
 *
 * @param {object} photos - Array of photo data. Multiple shapes are supported,
 * and shapes can be mixed and matched.
 *
 * Shape 1: Array of strings
 * ```
 *     ['photo1.jpg', 'photo2.jpg']
 * ```
 * 
 * Shape 2: Array of objects
 * ```
 *     [
 *       { src: 'photo1.jpg', entity: {} },
 *       { src: 'photo2.jpg', entity: {} },
 *     ]
 * ```
 *
 * Shape 3: Array of functions
 * ```
 *     [func1, func2] // where each func is async or sync and returns one of the shapes above
 * ```
 */
const PhotoViewer = ({
  photos,
  initialPhotoIndex = 0,
  onNext,
  onPrev,
  onClose,
  onImageLoad,
  onImageError,
  onOpenExternalMap,
  mapIconImagePath,
  usePortal,
  photoErrorMessage,
}: PropsWithChildren<PhotoViewerProps>) => {
  const dispatch = useDispatch()
  const viewerRef = useRef(null)
  const zoomerRef = useRef(null)
  const imgRef = useRef(null)
  const isMultiImage = photos.length >= 2
  const { lang } = useSelector(settingsSelectors.current)
  const [isLoading, setIsLoading] = useState(false)
  const [imageElId] = useState(v4())
  const [currentPhotoEntity, setCurrentPhotoEntity] = useState()
  const [currentImageIndex, setCurrentImageIndex] = useState(initialPhotoIndex)
  const [currentPhotoSrc, setCurrentPhotoSrc] = useState<string>()
  const [nextMouseUpWillToggleUI, setNextMouseUpWillToggleUI] = useState(true)
  const [hideUI, setHideUI] = useState(false)
  const [convertedFrom, setConvertedFrom] = useState()
  const [convertedTo, setConvertedTo] = useState()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  /**
   * Returns the current photo in the array. It can be a string, object, or function.
   */
  const getCurrentPhoto = () => photos?.[currentImageIndex]

  /**
   * Read the various shapes that the photos can be provided in and set the data
   * in state.
   */
  const digestPhoto = async (data?) => {
    setIsLoading(true)

    // Use current photo, or given data
    const photoOfUnknownShape = data
      ? data
      : getCurrentPhoto()

    if (typeof photoOfUnknownShape === 'string') {
      setCurrentPhotoSrc(photoOfUnknownShape)
      setCurrentPhotoEntity(null)
    } else if (typeof photoOfUnknownShape === 'function') {
      const loaded = await photoOfUnknownShape()
      if (typeof loaded === 'string') {
        setCurrentPhotoSrc(loaded)
        setCurrentPhotoEntity(null)
      } else {
        setCurrentPhotoEntity(loaded?.entity)
        setCurrentPhotoSrc(loaded?.src)
        setConvertedFrom(loaded?.convertedFrom)
        setConvertedTo(loaded?.convertedTo)
      }
    } else {
      setCurrentPhotoEntity(photoOfUnknownShape?.entity)
      setCurrentPhotoSrc(photoOfUnknownShape?.src)
      setConvertedFrom(photoOfUnknownShape?.convertedFrom)
      setConvertedTo(photoOfUnknownShape?.convertedTo)
    }

    setIsLoading(false)
  }

  /**
   * Safely go to the prev image, or loop to the end.
   */
  const prevImage = () => {
    if (!isMultiImage) {
      return
    }
    const prev = currentImageIndex === 0 ? photos.length - 1 : currentImageIndex - 1
    setCurrentImageIndex(prev)
    setCurrentPhotoSrc(undefined)
    onPrev?.(prev)
  }

  /**
   * Safely go to the next image, or loop to the beginning.
   */
  const nextImage = () => {
    if (!isMultiImage) {
      return
    }
    const next = currentImageIndex + 1 === photos.length ? 0 : currentImageIndex + 1
    setCurrentImageIndex(next)
    setCurrentPhotoSrc(undefined)
    onNext?.(next)
  }

  /**
   * Reset zoom/pan every time the image is changed.
   */
  const handleImageLoad = () => {
    if (zoomerRef.current) {
      setTimeout(() => {
        if (zoomerRef.current) {
          zoomerRef.current?.maxZoomDown()
        }
      }, 0)
    }
    onImageLoad?.(currentPhotoSrc, currentPhotoEntity)
  }

  /**
   * When there is an image loading error.
   */
  const handleImageError = (...args) => {
    dispatch(toastActions.addToQueue({
      title: i18n['photo-load-error.title'][lang],
      body: i18n['photo-load-error.body'][lang],
      type: 'danger',
      ttl: 8000,
    }))
    onImageError?.(currentPhotoSrc, currentPhotoEntity, ...args)
  }

  /**
   * When the viewer is closed.
   */
  const handleClose = () => {
    onClose?.()
  }

  /**
   * When the sidebar is opened or closed.
   */
  const toggleSidebar = (to?) => {
    if (to) {
      setSidebarOpen(to)
    } else {
      setSidebarOpen(!sidebarOpen)
    }
  }

  /**
   * Render the viewer in a portal.
   */
  const inPortal = (content) => {
    if (usePortal) {
      return createPortal(content, document.querySelector('#photo-viewer-portal'))
    } else {
      return content
    }
  }

  /**
   * Init zoom.
   */
  useEffect(() => {
    setTimeout(() => {
      if (!imgRef.current || zoomerRef.current) return
      zoomerRef.current = zoomer.create(`#${imageElId}`, {
        type: 'image',
        minScale: 1,
        maxScale: 10,
        dragScrollable: true,
        zoomOnDblClick: true,
        smoothTime: 0,
      })
    }, 0)
    return () => zoomerRef.current = null
  }, [currentPhotoSrc])

  /**
   * Event handlers.
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e?.key) {
        case 'Escape':
          if (sidebarOpen) {
            toggleSidebar(false)
          } else {
            handleClose()
          }
          break
        case ' ':
          if (!e.target.matches('button')) {
            e.preventDefault()
            e.stopPropagation()
            if (sidebarOpen) {
              toggleSidebar(false)
            } else {
              toggleSidebar(true)
            }
          }
          break
        case 'ArrowRight':
          nextImage()
          break
        case 'ArrowLeft':
          prevImage()
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentImageIndex, sidebarOpen])

  /**
   * Whenever the current image index changes, set its data.
   */
  useEffect(() => {
    digestPhoto()
  }, [currentImageIndex])

  return inPortal(
    (
      <div
        ref={viewerRef}
        className={clsx(
          'photo-viewer',
          hideUI ? 'hide-ui' : 'show-ui',
          sidebarOpen ? 'sidebar-open' : 'sidebar-closed',
        )}
      >
        {/* FIXME add spring */}
        <motion.div
          className="photo-viewer-image"
          animate={{
            right: sidebarOpen ? SIDEBAR_WIDTH : 0,
          }}
        >
          <div
            className="photo-frame"
            // Clicks should only toggle the UI if they don't move
            onMouseDown={() => {
              setNextMouseUpWillToggleUI(true)
            }}
            onMouseMove={() => {
              setNextMouseUpWillToggleUI(false)
            }}
            onMouseUp={() => {
              if (nextMouseUpWillToggleUI) {
                setHideUI(!hideUI)
              }
            }}
          >
            {photoErrorMessage && !isLoading && <div className="load-error-message">{photoErrorMessage}</div>}
            {currentPhotoSrc && !photoErrorMessage &&
              <img
                ref={imgRef}
                id={imageElId}
                src={currentPhotoSrc}
                className="image"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            }
            {isLoading && !photoErrorMessage && <Loading className="photo-viewer-loading" color="white" />}
          </div>
          <div className="photo-control-bar hides">
            <nav className="photo-control-bar-nav">
              {/* Pagination */}
              {Array.isArray(photos)
                ? <span className="photo-control-bar-nav-pagination">
                    {currentImageIndex + 1}
                    <span className="photo-control-bar-nav-pagination-sep">{i18n['pagination.sep'][lang]}</span>
                    {photos.length}
                  </span>
                : null
              }
            </nav>
          </div>
          <div className="photo-viewer-actions">
            {/* Close button */}
            <button
              className="close-viewer viewer-button hides"
              type="button"
              title={i18n['controls.close.title'][lang]}
              onClick={handleClose}
            >
              <i className="fas fa-times-circle" />
            </button>
            {/* Sidebar button */}
            <button
              className="toggle-sidebar viewer-button hides"
              type="button"
              title={i18n['controls.sidebar.title'][lang]}
              onClick={() => toggleSidebar()}
            >
              <i className="fas fa-info-circle" />
            </button>
          </div>
          {/* Prev button */}
          {isMultiImage &&
            <button
              className="prev-photo viewer-button hides"
              type="button"
              title={i18n['controls.prev.title'][lang]}
              onClick={() => prevImage()}
            >
              <i className="fas fa-arrow-circle-left" />
            </button>
          }
          {/* Next button */}
          {isMultiImage &&
            <button
              className="next-photo viewer-button hides"
              type="button"
              title={i18n['controls.next.title'][lang]}
              onClick={() => nextImage()}
            >
              <i className="fas fa-arrow-circle-right" />
            </button>
          }
        </motion.div>
        <PhotoViewerSidebar
          width={SIDEBAR_WIDTH}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen as () => void}
          isLoading={isLoading}
          photoSrc={currentPhotoSrc}
          photoEntity={currentPhotoEntity}
          convertedFrom={convertedFrom}
          convertedTo={convertedTo}
          onOpenExternalMap={onOpenExternalMap}
          mapIconImagePath={mapIconImagePath}
          reloadPhotoEntity={digestPhoto}
        />
      </div>
    ),
  )
}

export default PhotoViewer
