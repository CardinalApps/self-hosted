import { useEffect, useState } from 'react'
import homeServerAPI from '../lib/homeserver/homeServerAPI'
import queryParams from '../lib/net/queryParams'

export type ReleaseCoverSize = 'small_nocrop' | 'medium_nocrop'

export function useReleaseCover(releaseId: string | number, size: ReleaseCoverSize = 'small_nocrop'): [string, { coverIsLoading: boolean }] {
  const [imageSrc, setImageSrc] = useState<string>()
  const [coverIsLoading, setCoverIsLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!releaseId) {
      setImageSrc(null)
      return
    }
    homeServerAPI<{
      blobUrl: string,
    }>(queryParams(`/music/releases/${releaseId}/cover`, { size }), 'GET', { blob: true })
      .then(({ blobUrl }) => {
        setImageSrc(blobUrl)
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        setCoverIsLoading(false)
      })
  }, [releaseId, size])

  return [imageSrc, { coverIsLoading }]
}
