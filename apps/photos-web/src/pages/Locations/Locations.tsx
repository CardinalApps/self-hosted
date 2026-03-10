import { useState, useEffect } from 'react'
import ms from 'ms'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Map from '@cardinalapps/ui/src/components/features/Map'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'


import { queryParams } from '@cardinalapps/ui/src/lib/net/queryParams'
import useLargeData from '../../hooks/useLargeData'

import './styles.css'

import { HOME_SERVER_HOST } from '../../env'

const defaults = {
  take: 1000000,
  skip: 0,
  order: 'desc',
}

function LocationsPage() {
  // const { lang } = useSelector(settingsSelectors.current)
  // const [selectedPhoto, setSelectedPhoto] = useState()
  // const [initialMapZoom] = useState(11)
  // const [initialMapPosition] = useState([40.79109283486991, -73.97536683683397])
  const [markers, setMarkers] = useState([])
  const { data } = useLargeData([], queryParams(`/photos`, {
    thumbnails: true,
    metadata: false,
    order: defaults.order,
    take: defaults.take,
    skip: defaults.skip,
  }),
  {
    expiration: ms('8 seconds'),
  })

  /**
   * Convert photos to markers.
   */
  useEffect(() => {
    if (!data) return

    const markers = []

    data.forEach((photo) => {
      if (photo?.gpsLat && photo?.gpsLng) {
        const marker = {
          popupAnchor: [photo.gpsLat, photo.gpsLng],
          iconSize: [40, 40],
          photo,
        }
        markers.push(marker)
      }
    })

    setMarkers(markers)
  }, [data])

  return (
    <AppPage
      layout={PAGE_LAYOUT.full}
      capabilities={['Photos.Read']}
    >
      <div className="locations">
        <Map
          renderDelay={400}
          markers={markers}
          mapIconImagePath={'/photos/icons/marker.png'}
          onMarkerClick={({ marker, setActiveContent }) => {
            const thumb = HOME_SERVER_HOST + marker.photo.thumbnail.find((photo) => photo.size === 'medium_nocrop')?.relativeSrc
            setActiveContent(<img src={thumb} />)
          }}
        />
      </div>
    </AppPage>
  )
}

export default LocationsPage
