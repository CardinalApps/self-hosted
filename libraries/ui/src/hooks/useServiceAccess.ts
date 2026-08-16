import { useCallback, useEffect, useState } from 'react'

import { getServiceAccess, retractServiceAccess } from '../lib/auth/serviceAccess'
import type { ServiceAccessFeature } from '../lib/auth/serviceAccess'

export type UseServiceAccess = {
  features: ServiceAccessFeature[] | null,
  refresh: () => Promise<void>,
  retract: (slugs: readonly string[]) => Promise<void>,
}

/*
 * The signed-in cloud account's service access grants. `features` stays null until the first read
 * resolves, which is what tells consumers to paint a loading state; a failed read settles as an
 * empty list so the UI falls back to "no access yet" instead of spinning forever.
 */
export default function useServiceAccess({ skip = false }: { skip?: boolean } = {}): UseServiceAccess {
  const [features, setFeatures] = useState<ServiceAccessFeature[] | null>(null)

  const refresh = useCallback(async () => {
    if (skip) {
      return
    }

    try {
      setFeatures(await getServiceAccess())
    } catch (error) {
      console.warn('Could not read cloud service access.', error)
      setFeatures([])
    }
  }, [skip])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { features, refresh, retract: retractServiceAccess }
}
