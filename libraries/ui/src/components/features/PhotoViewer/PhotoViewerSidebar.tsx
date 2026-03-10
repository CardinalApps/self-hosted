import { useState, useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import formatDistanceToNow from 'date-fns/formatDistanceToNowStrict'

import H4 from '../../typography/H4'
import H6 from '../../typography/H6'
import Card from '../../layout/Card'
import Button from '../../interaction/Button'
import Select from '../../forms/Select'
import Map from '../Map'
import type { PhotoEntity } from './PhotoViewer'

import { settingsSelectors } from '../../../store/slices/settings'
import { toastActions } from '../../../store/slices/toast'
import { useGetPhotoAlbumsQuery } from '../../../store/apis/photoAlbums'

import homeServerAPI from '../../../lib/homeserver/homeServerAPI'

import formatMetadata from './utils/formatMetadata'
import type { PhotoMetadata } from './utils/formatMetadata'

import i18n from './i18n'

type PhotoViewerSidebarProps = {
  width: number,
  isOpen: boolean,
  setIsOpen: (boolean) => void,
  isLoading: boolean,
  photoSrc: string,
  photoEntity: PhotoEntity,
  convertedFrom: string,
  convertedTo: string,
  onOpenExternalMap: () => void,
  mapIconImagePath: string,
  photoAlbums?: unknown[],
  reloadPhotoEntity: () => void,
}

/**
 * Photo viewer sidebar.
 */
const PhotoViewerSidebar = ({
  width,
  isOpen,
  setIsOpen,
  isLoading,
  photoSrc,
  photoEntity,
  convertedFrom,
  convertedTo,
  onOpenExternalMap,
  mapIconImagePath,
  //reloadPhotoEntity,
}: PropsWithChildren<PhotoViewerSidebarProps>) => {
  const dispatch = useDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const [fileName, setFileName] = useState<string>()
  const [daysAgo, setDaysAgo] = useState<string>()
  const [takenAtDate, setTakenAtDate] = useState<string>()
  const [takenAtTime, setTakenAtTime] = useState<string>()
  const [currentImageMetadata, setCurrentImageMetadata] = useState<PhotoMetadata>()
  const [currentPhotoAlbums, setCurrentPhotoAlbums] = useState([])
  const [mapLat, setMapLat] = useState<number>()
  const [mapLng, setMapLng] = useState<number>()
  const { data/*, isFetching, isLoading, refetch*/ } = useGetPhotoAlbumsQuery({})
  const [photoAlbums = []] = data || []

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else if (document.exitFullscreen) {
      document.exitFullscreen()
    }
  }

  /**
   * Write the range in words.
   */
  const formatDaysAgo = (pastDate) => {
    return formatDistanceToNow(new Date(pastDate), { addSuffix: true })
  }

  /**
   * Send photo album updates to the Media Server.
   */
  const handlePhotoAlbumsChange = (newAlbums) => {
    if (!newAlbums?.length) return

    homeServerAPI(`/photo/${photoEntity.photoId}`, 'PATCH', {
      body: {
        photoAlbums: newAlbums,
      },
    })
      .then(() => {
        // Need to reload the photo to get the updated photo album list
        setCurrentPhotoAlbums(newAlbums)
        dispatch(toastActions.addToQueue({
          title: i18n['photo-albums.update-success.title']['en'],
          type: 'success',
          ttl: 3000,
        }))
      })
      .catch((error) => {
        dispatch(toastActions.addToQueue({
          title: i18n['photo-albums.update-error.title']['en'],
          type: 'danger',
          body: error?.message,
          ttl: 6000,
        }))
      })
  }

  /**
   * Set initial state.
   */
  useEffect(() => {
    if (photoEntity) {
      setFileName(photoEntity?.file?.relativePath?.split('/')?.pop())
      setDaysAgo(formatDaysAgo(photoEntity.takenAt))
      setTakenAtDate(new Date(photoEntity.takenAt).toDateString())
      setTakenAtTime(new Date(photoEntity.takenAt).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }))
      setCurrentImageMetadata(formatMetadata(photoEntity, photoEntity?.metadata, lang))
      setMapLat(photoEntity?.gpsLat)
      setMapLng(photoEntity?.gpsLng)
      if (Array.isArray(photoEntity.photoAlbumEntries)) {
        setCurrentPhotoAlbums(photoEntity.photoAlbumEntries.map((entry) => entry?.photoAlbum?.id))
      }
    } else {
      if (photoSrc) {
        setFileName(photoSrc.split('/').pop())
      }
    }
  }, [photoEntity, photoSrc])

  return (
    <motion.div
      className="photo-viewer-sidebar"
      style={{
        width,
        right: -width,
      }}
      animate={{
        right: isOpen ? 0 : -width,
      }}
    >
      <Card
        border={0}
        shadow={2}
        className="photo-viewer-sidebar-card"
      >
        {isLoading
          ? <div className="loading"></div>
          : <>
              <div className="general-info">
                <div className="title-row">
                  {/* File name */}
                  {photoSrc && fileName &&
                    <H4 className="file-name" title={fileName}>{fileName}</H4>
                  }
                  <button
                    type="button"
                    className="close-sidebar"
                    title={i18n['controls.close.title'][lang]}
                    onClick={() => setIsOpen(false)}
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
                <div className="date-metadata">
                  {/* Taken date/time */}
                  {takenAtDate &&
                    <p className="taken-at">{takenAtDate}, {takenAtTime} {daysAgo ? `(${daysAgo})` : ''}</p>
                  }
                </div>
              </div>
              <div className="sidebar-buttons">
                <div>
                  {/* Slideshow button */}
                  <Button
                    solid
                    className="slideshow secondary-button"
                    onClick={() => alert('Coming soon')}
                  >
                    <i className="fas fa-stopwatch" />
                    {i18n['controls.slideshow.title'][lang]}
                  </Button>
                  {/* Fullscreen button */}
                  <Button
                    solid
                    className="fullscreen secondary-button"
                    onClick={() => toggleFullScreen()}
                  >
                    <i className="fas fa-expand-alt" />
                    {i18n['controls.fullscreen'][lang]}
                  </Button>
                </div>
                {/* Add to photo albums */}
                {photoEntity &&
                  <div className="photo-albums">
                    <Select
                      //name="photo-albums"
                      value={currentPhotoAlbums}
                      size="m"
                      labelIcon="fas fa-folder-plus"
                      selectPlaceholder={i18n['photo-albums.title'][lang]}
                      onChange={handlePhotoAlbumsChange}
                      typingAreaStyles={{
                        border: 'none',
                      }}
                      upperStyles={{
                        paddingLeft: 33,
                      }}
                      options={photoAlbums.map((photoAlbum) => {
                        return {
                          label: photoAlbum.name,
                          value: photoAlbum.id,
                        }
                      })}
                    />
                  </div>
                }
              </div>
              <div className="file-metadata">
                <div className="metadata-title-bar">
                  <H6 className="metadata-title">{i18n['metadata.title'][lang]}</H6>
                  <div className="metadata-tags">
                    {/* File format */}
                    {convertedTo && convertedFrom
                      ? <div
                          className="conversion-status metadata-tag"
                          title={convertedTo && convertedFrom
                            ?
                            i18n['controls.conversion.title.converted'][lang]
                              .replace('{from}', convertedFrom?.toUpperCase())
                              .replace('{to}', convertedTo?.toUpperCase())
                            : i18n['controls.conversion.title.original'][lang]
                          }
                        >
                          <span>{convertedFrom}</span>
                          <i className="converted-icon fas fa-random" />
                          <span>{convertedTo}</span>
                        </div>
                      : photoEntity?.file?.extension &&
                          <div className="conversion-status metadata-tag">
                            {photoEntity?.file?.extension && <span>{photoEntity.file.extension}</span>}
                          </div>
                    }
                    {/* Image dimensions */}
                    {photoEntity?.width && photoEntity?.height &&
                      <div className="image-dimensions metadata-tag">
                        <span>{photoEntity.width}</span>
                        <span className="dimensions-sep">x</span>
                        <span>{photoEntity.height}</span>
                      </div>
                    }
                  </div>
                </div>
                <div className="metadata-scroll">
                  {currentImageMetadata
                    ?
                    Object.keys(currentImageMetadata).map((metadataType) => {
                      return (
                        <div key={metadataType} className="metadata-list">
                          <p className="metadata-type">{metadataType}</p>
                          <ul>
                            {currentImageMetadata[metadataType].map((metadata) => {
                              return (
                                <li key={`${metadataType}-${metadata.key}`}>
                                  <span className="metadata-key" title={metadata.key}>{metadata.key}</span>
                                  <span className="metadata-value" title={metadata.value}>{metadata.value}</span>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )
                    })
                    : <p>{i18n['metadata.none'][lang]}</p>
                  }
                </div>
              </div>
              <div className="sidebar-map">
                {mapLat && mapLng
                  ? <Map
                      markers={[
                        {
                          popupAnchor: [mapLat, mapLng],
                          iconSize: [40, 40],
                        },
                      ]}
                      initialMapPosition={[mapLat, mapLng]}
                      initialMapZoom={16}
                      compactUI={true}
                      mapIconImagePath={mapIconImagePath}
                      onOpenExternalMap={onOpenExternalMap}
                    />
                  : <p className="map-not-available">
                      {i18n['sidebar.map.not-available'][lang]}
                    </p>
                }
              </div>
            </>
        }
      </Card>
    </motion.div>
  )
}

export default PhotoViewerSidebar
