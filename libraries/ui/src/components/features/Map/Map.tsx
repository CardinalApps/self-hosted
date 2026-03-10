// @ts-nocheck Why are types broken here?

import { useState, useEffect, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'

import Card from '../../layout/Card'
import SearchBar from '../../interaction/SearchBar'

import { settingsSelectors } from '../../../store/slices/settings'

import i18n from './i18n'

import './Map.css'
import 'leaflet/dist/leaflet.css'

type MarkerOptions = {
  popupAnchor: [number, number],
  iconSize: [number, number],
}

type MapProps = {
  markers?: MarkerOptions[],
  compactUI?: boolean,
  initialMapPosition?: unknown[],
  initialMapZoom?: number,
  renderDelay?: number,
  onMarkerClick?: ({ marker, setActiveContent }) => void,
  mapIconImagePath?: string,
  onOpenExternalMap?: () => void,
}

function Map({
  markers = [],
  compactUI = false,
  initialMapPosition = [40.79109283486991, -73.97536683683397],
  initialMapZoom = 11,
  renderDelay = 0,
  onMarkerClick,
  mapIconImagePath = '/icons/marker.png',
  onOpenExternalMap,
}: PropsWithChildren<MapProps>) {
  const mapRef = useRef(null)
  const { lang } = useSelector(settingsSelectors.current)
  const [readyToRender, setReadyToRender] = useState(false)
  const [, setSelectedMarker] = useState<MarkerOptions>()
  const [activeContent, setActiveContent] = useState(null)

  /**
   * Handle esc click.
   */
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setSelectedMarker(null)
        setActiveContent(null)
      }
    }

    document.addEventListener('keydown', onEsc)

    return () => {
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  /**
   * Optional delay before rendering to allow animations to complete.
   */
  useEffect(() => {
    setTimeout(() => {
      setReadyToRender(true)
    }, renderDelay)
  }, [])

  return (
    readyToRender
      ? <div className="map">
          {compactUI
            ? <div className="compact-controls">
                {onOpenExternalMap &&
                  <button type="button" onClick={() => onOpenExternalMap?.()}>
                    <i className="fas fa-map-marked-alt" />
                  </button>
                }
              </div>
            : <div className="map-controls">
                <div className="map-search">
                  <SearchBar placeholder={i18n['map-seach.placeholder'][lang]} />
                </div>
                <div className="map-content-pillar">
                  <AnimatePresence mode="wait">
                    {activeContent &&
                      <motion.div
                        style={{ position: 'relative' }}
                        initial={{
                          top: -8,
                          opacity: 0,
                        }}
                        animate={{
                          top: 0,
                          opacity: 1,
                          transition: { type: 'spring' },
                        }}
                        exit={{
                          top: -8,
                          opacity: 0,
                          transition: { type: 'spring' },
                        }}
                      >
                        <Card className="map-marker-content-box" shadow={3} padding="none">
                          {activeContent}
                        </Card>
                      </motion.div>
                    }
                  </AnimatePresence>
                  <div className="map-zoom-controls">
                    <div>
                      <button type="button" onClick={() => mapRef.current.zoomIn()}>
                        <i className="fas fa-plus" />
                      </button>
                    </div>
                    <div>
                      <button type="button" onClick={() => mapRef.current.zoomOut()}>
                        <i className="fas fa-minus" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          }
          <MapContainer
            ref={mapRef}
            className="map-container"
            center={initialMapPosition}
            zoom={initialMapZoom}
            scrollWheelZoom={true}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {!!markers.length && markers.map((marker: MarkerOptions, i) => {
              const icon = new L.Icon({
                iconUrl: mapIconImagePath,
                iconRetinaUrl: mapIconImagePath,
                ...marker,
              })
              return (
                <Marker
                  key={i}
                  //icon={icon}
                  position={icon.options.popupAnchor}
                  eventHandlers={{
                    click: () => {
                      setSelectedMarker(marker)
                      onMarkerClick?.({
                        marker,
                        setActiveContent,
                      })
                    },
                  }}
                />
              )
            })}
          </MapContainer>
        </div>
      : null
  )
}

export default Map
