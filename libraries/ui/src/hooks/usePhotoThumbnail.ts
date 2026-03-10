import { useEffect, useState } from 'react'

import homeServerAPI from '../lib/homeserver/homeServerAPI'
import queryParams from '../lib/net/queryParams'

export function usePhotoThumbnail(photoId: string | number, size: string = 'small_nocrop') {
  const [imageSrc, setImageSrc] = useState<string>()

  useEffect(() => {
    homeServerAPI<{
      blobUrl: string,
    }>(
      queryParams(`/photo/${photoId}/thumbnail`, { size }),
      'GET',
      { blob: true },
    )
      .then(({ blobUrl }) => {
        setImageSrc(blobUrl)
      })
      .catch((error) => {
        console.error(error)
      })
  }, [photoId])

  return imageSrc
}
