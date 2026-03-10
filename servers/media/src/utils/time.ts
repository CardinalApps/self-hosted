type CancelTimer = () => void

/**
 * Starts a timer that invokes the callback function in x seconds.
 */
export function happensInXSeconds(seconds, cb): CancelTimer {
  const timerId = setTimeout(() => {
    cb?.()
  }, seconds * 1000)

  return () => {
    if (timerId) {
      clearTimeout(timerId)
    }
  }
}
