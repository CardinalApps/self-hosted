import { useEffect, useMemo, useRef } from 'react'

/**
 * Returns a stable function that invokes `fn` at most once per `delay` ms, on both the leading and
 * the trailing edge, always with the most recent arguments. Built for continuous inputs (dragging a
 * slider or a colour picker) where every intermediate value would otherwise reach the store.
 *
 * `fn` may be a fresh closure on every render; the latest one is always the one invoked. Any pending
 * trailing call is flushed on unmount so the final value of an interaction is never dropped.
 */
const useThrottledCallback = <A extends unknown[]>(fn: (...args: A) => void, delay: number) => {
  const fnRef = useRef(fn)
  fnRef.current = fn

  const pending = useRef<{ args: A | null, timer: ReturnType<typeof setTimeout> | null, lastRunAt: number }>({
    args: null,
    timer: null,
    lastRunAt: 0,
  })

  const throttled = useMemo(() => {
    const run = () => {
      const { args } = pending.current
      pending.current.args = null
      pending.current.timer = null
      pending.current.lastRunAt = Date.now()

      if (args) {
        fnRef.current(...args)
      }
    }

    const call = (...args: A) => {
      pending.current.args = args

      if (pending.current.timer) {
        return
      }

      const sinceLastRun = Date.now() - pending.current.lastRunAt
      if (sinceLastRun >= delay) {
        run()
      } else {
        pending.current.timer = setTimeout(run, delay - sinceLastRun)
      }
    }

    call.flush = () => {
      if (pending.current.timer) {
        clearTimeout(pending.current.timer)
        run()
      }
    }

    return call
  }, [delay])

  useEffect(() => () => throttled.flush(), [throttled])

  return throttled
}

export default useThrottledCallback
