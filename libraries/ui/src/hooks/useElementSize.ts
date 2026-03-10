import { useState, useEffect, useCallback } from 'react'

export type ElementSize = {
  width: number,
  height: number,
}

/**
 * Returns the width and height of a DOM element. Accepts either a CSS selector
 * string or a React ref object.
 */
export default function useElementSize(selector: string | React.RefObject<HTMLElement>) {
  const element: HTMLElement | null = typeof selector === 'string'
    ? document.querySelector(selector)
    : selector.current
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  const updateSize = useCallback(() => {
    if (element) {
      setSize({
        width: element.offsetWidth,
        height: element.offsetHeight,
      })
    }
  }, [element])

  useEffect(() => {
    if (!element) return

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(element)

    return () => observer.disconnect()
  }, [element, updateSize])

  return size
}
