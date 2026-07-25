import { useState, useEffect } from 'react'

export type ElementSize = {
  width: number,
  height: number,
}

/**
 * Returns the width and height of a DOM element. Accepts either a CSS selector
 * string or a React ref object.
 */
export default function useElementSize(selector: string | React.RefObject<HTMLElement>) {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    /* Resolved here rather than during render because a ref holds nothing until after mount,
       which would leave the observer with nothing to watch and the size stuck at zero. */
    const element: HTMLElement | null = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector.current

    if (!element) return

    const updateSize = () => setSize({
      width: element.offsetWidth,
      height: element.offsetHeight,
    })

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(element)

    return () => observer.disconnect()
  }, [selector])

  return size
}
