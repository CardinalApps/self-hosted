import { useState, useEffect } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import PhotoViewer, { PhotoObject } from './PhotoViewer'

import usePhoto from '../../../hooks/usePhoto'
import homeServerAPI from '../../../lib/homeserver/homeServerAPI'
import queryParams from '../../../lib/net/queryParams'

import samplePhotos from './data/samplePhotos'

const meta = {
  title: 'Feature/PhotoViewer',
  component: PhotoViewer,
  argTypes: {},
} satisfies Meta<typeof PhotoViewer>
type Story = StoryObj<typeof meta>

export const SingleImage: Story = {
  args: {
    photos: ['/sample/images/original/birb.jpg'],
    onClose: () => console.log('Closed'),
  },
}

export const MultiImage: Story = {
  args: {
    photos: [
      // @ts-expect-error fix
      {
        src: '/sample/images/original/birb.jpg',
        entity: samplePhotos[0],
      },
      // @ts-expect-error fix
      {
        src: '/sample/images/original/car.jpg',
        entity: samplePhotos[1],
      },
      '/sample/images/original/guitar.jpg',
    ],
    onOpenExternalMap: () => alert('External map'),
    onClose: () => console.log('Closed'),
  },
}


const fn1 = () => new Promise<string>((resolve) => {
  setTimeout(() => {
    resolve('/sample/images/original/birb.jpg')
  }, 1000)
})

const fn2 = () => new Promise<PhotoObject>((resolve) => {
  setTimeout(() => {
    // @ts-expect-error fix
    resolve({
      src: '/sample/images/original/guitar.jpg',
      entity: samplePhotos[1],
    })
  }, 1000)
})

export const AsyncImages: Story = {
  args: {
    photos: [
      // @ts-expect-error can't get the type to play nicely
      fn1,
      // @ts-expect-error can't get the type to play nicely
      fn2,
    ],
    onClose: () => console.log('Closed'),
  },
}

export const ImageError: Story = {
  args: {
    photos: ['/invalid-image-url.jpg'],
    onImageError: (...args) => console.log('Image loading error', ...args),
    onClose: () => console.log('Closed'),
  },
}

/**
 * Uses real photos from the local Media Server.
 */
export function RealPhotos() {
  const { fetchPhoto, photoError } = usePhoto()
  const [photoEntities, setPhotoEntities] = useState([])

  useEffect(() => {
    homeServerAPI(queryParams('/photos', { take: 3, metadata: true, photoAlbumEntries: true }))
      .then((res) => {
        if (!res?.[0]?.length) return
        setPhotoEntities(res[0].map((photo) => () => fetchPhoto(photo.id)))
      })
      .catch(() => {
        console.log('Dev Home server is offline')
      })
  }, [])

  return photoEntities.length
    ? <PhotoViewer
        photos={photoEntities}
        onClose={() => console.log('Closed')}
        photoErrorMessage={photoError?.message}
      />
    : <p>Loading</p>
}

export default meta
