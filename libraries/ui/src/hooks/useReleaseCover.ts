import { useEffect, useState } from 'react'
import homeServerAPI from '../lib/homeserver/homeServerAPI'

export function useReleaseCover(releaseId: string | number): [string, { coverIsLoading: boolean }] {
  const [imageSrc, setImageSrc] = useState<string>()
  const [coverIsLoading, setCoverIsLoading] = useState<boolean>(true)

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
      .finally(() => {
        setCoverIsLoading(false)
      })
  }, [releaseId])

  return [imageSrc, { coverIsLoading }]
}
