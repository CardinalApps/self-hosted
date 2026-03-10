import { useEffect, useContext, useRef } from 'react'
import { RouterContext } from '../context/router'
import { layoutActions, layoutSelectors, SCROLL_RESTORATION_KEYS } from '../store/slices/layout'
import { useSelector } from 'react-redux'
import { useAppDispatch } from './useAppDispatch'

export default function useScrollPointRestoration(selector: string, skip: boolean = false) {
  const dispatch = useAppDispatch()
  const throttleRef = useRef(null)
  const { location } = useContext(RouterContext)
  const scrollKey = `${SCROLL_RESTORATION_KEYS.page}:${location.pathname}`
  const scrollPoints = useSelector(layoutSelectors.scrollPoints)

  /**
   * Restore scroll point.
   */
  useEffect(() => {
    const el = document.querySelector(selector)

    const handlePageScroll = (e) => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current)
      }
      throttleRef.current = setTimeout(() => {
        dispatch(layoutActions.saveScrollPoint({ name: scrollKey, px: e.target.scrollTop }))
      }, 200)
    }

    if (el && !skip) {
      el.addEventListener('scroll', handlePageScroll)
    }

    return () => {
      if (el && !skip) {
        el.removeEventListener('scroll', handlePageScroll)
      }
    }
  }, [location.pathname, selector, skip])

  /**
   * Save scroll position.
   */
  useEffect(() => {
    const el = document.querySelector(selector)

    if (
      el
      && scrollPoints?.[scrollKey]
      && !skip
    ) {
      setTimeout(() => {
        el.scrollTop = scrollPoints[scrollKey] as number
      }, 0)
    }
  }, [location.pathname, selector, skip])
}
