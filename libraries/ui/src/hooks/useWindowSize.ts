import { useState, useEffect } from 'react'

const getSize = () => ({
  width: typeof window !== 'undefined' ? window.innerWidth : undefined,
  height: typeof window !== 'undefined' ? window.innerHeight : undefined,
})

export default function useWindowSize() {
  const [windowSize, setWindowSize] = useState(getSize)

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return windowSize
}
