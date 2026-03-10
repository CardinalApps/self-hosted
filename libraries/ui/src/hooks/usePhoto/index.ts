import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import homeServerAPI from '../../lib/homeserver/homeServerAPI'
import queryParams from '../../lib/net/queryParams'

import { settingsSelectors } from '../../store/slices/settings'

import i18n from './i18n'

type ImageObject = {
  [k: string]: string | boolean | Record<string, unknown>
}

/**
 * Loads a photo and its metadata from the server. This requires two requests to
 * the Media Server, one for the photo binary, and one for the metadata.
 */
export default function usePhoto(photoId?) {
  const { lang } = useSelector(settingsSelectors.current)
  const [photoObj, setPhotoObj] = useState<Record<string, unknown>>()
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState<{ label: string, message: string }>()

  /**
   * Related code: the digestPhoto() function in the PhotoViewer
   */
  const fetchPhoto = (photoId) => new Promise((resolve) => {
    const imageObject: ImageObject = {
      photo: '',
      photoObj: '',
      metadata: '',
      convertedFrom: '',
      convertedTo: '',
    }

    setPhotoLoading(true)

    Promise.all([
      // Load the image binary
      new Promise<void>((resolve) => {
        homeServerAPI<{
          blobUrl: string,
          response: { headers: Headers },
        }>(`/photo/${photoId}/blob`, 'GET', { blob: true })
          .then(({ blobUrl, response }) => {
            imageObject.src = blobUrl
            imageObject.convertedFrom = response.headers.get('Cardinal-Converted-Photo-From')
            imageObject.convertedTo = response.headers.get('Cardinal-Converted-Photo-To')
            setPhotoError(null)
            resolve()
          })
          .catch((error) => {
            setPhotoError({
              label: i18n['load-error'][lang as string],
              message: error?.message,
            })
            resolve()
          })
      }),
      // Load the image metadata
      new Promise((resolve) => {
        homeServerAPI(queryParams(`/photo/${photoId}`, { metadata: true, file: true, photoAlbumEntries: true }))
          .then((data) => {
            imageObject.entity = data as Record<string, unknown>
            resolve(data)
          })
          .catch((error) => {
            console.error(error?.message)
          })
      }),
    ])
      .then(() => {
        setPhotoLoading(false)
        resolve(imageObject)
      })
  })

  useEffect(() => {
    if (photoId) {
      fetchPhoto(photoId)
        .then((photoObj: Record<string, unknown>) => {
          setPhotoObj(photoObj)
        })
    }
  }, [photoId])

  return { photoLoading, photoError, photoObj, fetchPhoto }
}
