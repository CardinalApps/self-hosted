import { useEffect, useState } from 'react'

/**
 * Detects when the user scrolls to the bottom of the element.
 */
const useScrolledToBottom = (ref, threshold = 100) => {
  const [isBottom, setIsBottom] = useState<boolean>(false)
  const [distanceToBottom, setDistanceToBottom] = useState<number>(null)

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = ref.current
    const distance = Math.abs(scrollHeight - (scrollTop + clientHeight))
    setDistanceToBottom(distance)
    if (distance <= threshold) {
      setIsBottom(true)
    } else {
      setIsBottom(false)
    }
  }

  useEffect(() => {
    if (ref.current) {
      ref.current.addEventListener('scroll', handleScroll)
      return () => {
        if (ref.current) {
          ref.current.removeEventListener('scroll', handleScroll)
        }
      }
    }
  }, [ref.current])

  return [isBottom, distanceToBottom]
}

export default useScrolledToBottom
