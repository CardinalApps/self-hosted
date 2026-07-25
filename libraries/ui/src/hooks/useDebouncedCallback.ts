import { useEffect, useMemo, useRef } from 'react'

/**
 * Returns a stable function that calls `fn` once the calls stop for `delay` ms, collapsing a burst
 * into a single trailing invocation. Use it for the expensive tail of an interaction - persisting a
 * dragged value to a server - and `useThrottledCallback` for anything that has to stay responsive
 * while the burst is still running.
 *
 * `fn` may be a fresh closure on every render; the latest one is always the one invoked. A pending
 * call is flushed on unmount so edits are never dropped by navigating away.
 */
const useDebouncedCallback = <A extends unknown[]>(fn: (...args: A) => void, delay: number) => {
  const fnRef = useRef(fn)
  fnRef.current = fn

  const pending = useRef<{ args: A | null, timer: ReturnType<typeof setTimeout> | null }>({
    args: null,
    timer: null,
  })

  const debounced = useMemo(() => {
    const run = () => {
      const { args } = pending.current
      pending.current.args = null
      pending.current.timer = null

      if (args) {
        fnRef.current(...args)
      }
    }

    const call = (...args: A) => {
      pending.current.args = args

      if (pending.current.timer) {
        clearTimeout(pending.current.timer)
      }

      pending.current.timer = setTimeout(run, delay)
    }

    call.flush = () => {
      if (pending.current.timer) {
        clearTimeout(pending.current.timer)
        run()
      }
    }

    return call
  }, [delay])

  useEffect(() => () => debounced.flush(), [debounced])

  return debounced
}

export default useDebouncedCallback
