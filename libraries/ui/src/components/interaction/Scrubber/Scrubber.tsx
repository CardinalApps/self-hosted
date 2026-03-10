import { useState, useRef, useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './Scrubber.css'

type ScrubberPosition = {
  value: number,
  percent: number,
  offset: number,
}

type ScrubberProps = {
  value?: number,
  min?: number,
  max?: number,
  isPlaying?: boolean,
  rate?: number,
  className?: string,
  onChangeStart?: (position: ScrubberPosition) => void,
  onChange?: (position: ScrubberPosition) => void,
  onChangeEnd?: (position: ScrubberPosition) => void,
  onIsScrubbing?: (isScrubbing: boolean) => void,
}

/**
 * Scrubber.
 */
const Scrubber = ({
  value,
  min = 0,
  max = 100,
  onChangeStart = () => {},
  onChange = () => {},
  onChangeEnd = () => {},
  onIsScrubbing = () => {},
  className,
}: PropsWithChildren<ScrubberProps>) => {
  const scrubberRef = useRef(null)
  const handleRef = useRef(null)
  const lastOnChangeOffset = useRef(null)
  const lastOnChangePosition = useRef<ScrubberPosition>(null)
  const [offset, setOffset] = useState<number>()
  const [isScrubbing, setIsScrubbing] = useState(false)

  /**
   * Trigger the onChange callback only if it's different from the last time it
   * was called.
   */
  const onChangeDebounce = (pos) => {
    if (pos.offset !== lastOnChangeOffset.current) {
      setOffset(pos.offset)
      onChange(pos)
      lastOnChangeOffset.current = pos.offset
      lastOnChangePosition.current = pos
    }
  }

  /**
   * Calculate progress using the event position offset.
   */
  const getEventPosition = (e): ScrubberPosition => {
    const scrubberBox = scrubberRef.current.getBoundingClientRect()
    const pageX = e?.pageX
      ? e.pageX
      : e?.changedTouches?.[0] ? e.changedTouches[0]?.pageX : 0
    let offset = pageX - scrubberBox.left

    // Clamp
    if (offset < 0) offset = 0
    if (pageX > scrubberBox.right) offset = scrubberBox.width

    const percent = (offset / scrubberBox.width) * 100
    const value = min + ((max - min) * (percent / 100))

    return { value, percent, offset }
  }

  /**
   * Click and drag on desktop.
   */
  const handleMouseDown = (e) => {
    const body = document.querySelector('body')
    const pos = getEventPosition(e)

    const handleMove = (e) => {
      if (e.buttons === 1) {
        const pos = getEventPosition(e)
        onChangeDebounce(pos)
      }
    }

    setIsScrubbing(true)
    onChangeStart(pos)
    onChangeDebounce(pos)

    body.addEventListener('mousemove', handleMove)
    body.addEventListener('mouseup', (e) => {
      const pos = getEventPosition(e)
      onChangeEnd(pos)
      setIsScrubbing(false)
      body.removeEventListener('mousemove', handleMove)
    }, { once: true })
  }

  /**
   * Tap and drag on mobile.
   */
  const handleTouchStart = (e) => {
    const body = document.querySelector('body')
    const pos = getEventPosition(e)

    const handleMove = (e) => {
      const pos = getEventPosition(e)
      onChangeDebounce(pos)
    }

    setIsScrubbing(true)
    onChangeDebounce(pos)

    body.addEventListener('touchmove', handleMove)
    body.addEventListener('touchend', (e) => {
      const pos = getEventPosition(e)
      onChangeEnd(pos)
      setIsScrubbing(false)
      body.removeEventListener('touchmove', handleMove)
    }, { once: true })
  }

  useEffect(() => {
    onIsScrubbing(isScrubbing)
  }, [isScrubbing])

  /**
   * The value can be changed externally.
   */
  useEffect(() => {
    if (value && !isScrubbing) {
      const scrubberBox = scrubberRef.current.getBoundingClientRect()
      const percent = value / max
      const offset = scrubberBox.width * percent
      setOffset(offset)
    }
  }, [value])

  return (
    <div
      ref={scrubberRef}
      className={clsx("scrubber", className)}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="scrubber-bar">
        <div
          className="scrubber-bar-fill"
          style={{
            width: offset,
          }}
        />
      </div>
      <div
        ref={handleRef}
        className="scrubber-handle"
        tabIndex={0}
        onMouseDown={(e) => e.preventDefault()}
        onTouchStart={(e) => e.preventDefault()}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={lastOnChangePosition.current?.value || 0}
        style={{
          left: offset,
        }}
      />
    </div>
  )
}

export default Scrubber
