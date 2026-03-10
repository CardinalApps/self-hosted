import type { Meta } from '@storybook/react'

import Map from './Map'

const meta = {
  title: 'Feature/Map',
  component: Map,
  argTypes: {},
} satisfies Meta<typeof Map>

export const Default = () => {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Map
        markers={[
          {
            popupAnchor: [40.79109283486991, -73.97536683683397],
            iconSize: [40, 40],
          },
        ]}
        onMarkerClick={({ /*marker,*/ setActiveContent }) => {
          setActiveContent('Marker content... Marker content... Marker content... Marker content... Marker content... Marker content... Marker content... Marker content... Marker content... Marker content... Marker content... Marker content... Marker content...')
        }}
      />
    </div>
  )
}

export default meta
