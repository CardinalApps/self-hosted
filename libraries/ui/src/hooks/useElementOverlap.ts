import { useState, useEffect } from 'react'

function doRectsOverlap(a: DOMRect, b: DOMRect, threshold = 0): boolean {
  return !(
    a.right + threshold <= b.left ||
    b.right + threshold <= a.left ||
    a.bottom + threshold <= b.top ||
    b.bottom + threshold <= a.top
  )
}

/**
 * Accepts an array of CSS selectors and detects when the items overlap visually
 * on the screen.
 */
export default function useElementOverlap(selectors: string[], threshold = 10): boolean {
  const [overlapping, setOverlapping] = useState(false)
  const selectorsKey = selectors.join(',')

  useEffect(() => {
    const check = () => {
      const elements = selectors.map((s) => document.querySelector(s))
      if (elements.some((el) => !el)) {
        setOverlapping(false)
        return
      }

      const rects = elements.map((el) => el!.getBoundingClientRect())
      let isOverlapping = false

      outer: for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          if (doRectsOverlap(rects[i], rects[j], threshold)) {
            isOverlapping = true
            break outer
          }
        }
      }

      setOverlapping(isOverlapping)
    }

    check()

    const resizeObserver = new ResizeObserver(check)
    const mutationObserver = new MutationObserver(check)

    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) {
        resizeObserver.observe(el)
        mutationObserver.observe(el, { childList: true, subtree: true })
      }
    }

    window.addEventListener('resize', check)

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [selectorsKey, threshold])

  return overlapping
}
