import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { get, set } from 'idb-keyval'
import ms from 'ms'

import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'

import homeServerAPI from '@cardinalapps/ui/src/lib/homeserver/homeServerAPI'

const defaultOptions = {
  expiration: ms('10 minutes'),
}

/**
 * This hook uses IndexedDB as a key/value store. It is meant as an alternative
 * to RTK Query for large data sets.
 *
 * All Cardinal apps cache their Redux store in localStorage on every change,
 * but localStorage is limited to 5MB. IndexedDB has no limit and can be used to
 * cache large amounts of data.
 * 
 * This hook assumes that the API will return data in the format returned by
 * TypeORM's findAndCount() method, which is an array where the first item is an
 * array of paginated results, and the second item is the total number of
 * results in the database.
 *
 * @param {object} [defaultValue]
 * @param {object} [query]
 * @param {number} [givenOptions.expiration]
 */
export default function useLargeData(defaultValue, query, givenOptions = {}) {
  const dispatch = useDispatch()
  const [data, setData] = useState(defaultValue)
  const [isLoading, setIsLoading] = useState(true)

  const options = { ...defaultOptions, ...givenOptions }

  /**
   * Fetchs from the Media Server.
   */
  const fetchData = () => {
    return new Promise((resolve) => {
      homeServerAPI(query)
        .then((res) => {
          resolve(res)
        })
        .catch((error) => {
          dispatch(toastActions.addToQueue({
            title: error?.message,
            ttl: 5000,
          }))
        })
    })
  }

  /**
   * Wraps the stored value in an object with metadata.
   */
  const wrapValue = (value) => {
    return {
      cachedAt: Date.now(),
      value,
    }
  }

  /**
   * Set the value in IndexedDB and the local state.
   */
  const setLargeData = (data) => {
    setData(data)
    set(query, wrapValue(data))
      .catch((e) => console.error(e?.message))
  }

  /**
   * When the page is loaded, fetch the data if there is no cache.
   */
  useEffect(() => {
    setIsLoading(true)
    get(query)
      .then((res) => {
        if (
          // Cache miss
          !res || !res?.value

          // Always refetch if the cached array is empty
          || (Array.isArray(res?.value) && res?.value.length === 0)

          // Always refetch if the cached object is empty
          || (!Array.isArray(res?.value) && typeof value === 'object' && Object.keys(res?.value)?.length)

          // Refetch if the cache is expired
          || (res?.cachedAt + options.expiration < Date.now())
        ) {
          fetchData()
            .then(([fetchedData]) => {
              setIsLoading(false)
              setLargeData(fetchedData)
            })
        } else {
          setIsLoading(false)
          setData(res?.value)
        }
      })
  }, [])

  return { data, isLoading, setLargeData }
}
