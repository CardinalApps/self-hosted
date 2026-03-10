import { useEffect, useState } from 'react'

/**
 * Returns an object that contains the `clickedOutside` boolean, and a `reset`
 * function that can be used to reset the clickedOutside listener.
 *
 * @param {string|object} selector - Use a string for a CSS selector, or a ref.
 */
export default function useClickOutside(selector, escToClose = true) {
  const [clickedOutside, setClickedOutside] = useState(false)

  const onEsc = (e) => {
    if (e.key === 'Escape') {
      setClickedOutside(true)
    }
  }

  const onClickOutside = (e) => {
    if (typeof selector === 'string') {
      if (!e.target.closest(selector)) {
        setClickedOutside(true)
      }
    } else if (selector?.current) {
      if (e.target !== selector.current && !selector.current.contains(e.target)) {
        setClickedOutside(true)
      }
    }
  }

  const resetClickOutside = () => {
    setClickedOutside(false)
  }

  useEffect(() => {
    setTimeout(() => {
      if (escToClose) document.addEventListener('keydown', onEsc)
      document.addEventListener('click', onClickOutside)
    }, 0)

    return () => {
      if (escToClose) document.removeEventListener('keydown', onEsc)
      document.removeEventListener('click', onClickOutside)
    }
  }, [])

  return { clickedOutside, resetClickOutside }
}
