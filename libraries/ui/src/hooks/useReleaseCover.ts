import { useEffect, useState } from 'react'
import homeServerAPI from '../lib/homeserver/homeServerAPI'

export function useReleaseCover(releaseId: string | number) {
  const [imageSrc, setImageSrc] = useState<string>()

  useEffect(() => {
    if (!releaseId) {
      setImageSrc(null)
      return
    }
    homeServerAPI<{
      blobUrl: string,
    }>(`/music/releases/${releaseId}/cover`, 'GET', { blob: true })
      .then(({ blobUrl }) => {
        setImageSrc(blobUrl)
      })
      .catch((error) => {
        console.error(error)
      })
  }, [releaseId])

  return imageSrc
}
