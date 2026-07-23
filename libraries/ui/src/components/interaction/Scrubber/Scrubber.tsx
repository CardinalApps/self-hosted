import { useState, useRef, useEffect, useMemo } from 'react'
import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import type { MusicTrackWaveformType } from '../../../store/apis/musicTracks'
import {
  decodeWaveform,
  deriveWaveformPalettes,
  drawWaveformWave,
  compositeWaveform,
} from './drawWaveform'

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
  buffered?: number,
  isPlaying?: boolean,
  rate?: number,
  /* Stand the scrubber upright: the track runs bottom-to-top and needs a height from the parent */
  vertical?: boolean,
  /* When waveform data is given, the plain bar is replaced with the rendered wave (horizontal only) */
  waveform?: MusicTrackWaveformType | null,
  /* Colors to tint the wave with (e.g. from the cover art); falls back to the accent color */
  tintColors?: string[],
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
  buffered = 0,
  vertical = false,
  waveform = null,
  tintColors,
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

  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
  const waveformLayersRef = useRef<{ dim: HTMLCanvasElement, vivid: HTMLCanvasElement } | null>(null)
  const [waveformPaintTick, setWaveformPaintTick] = useState(0)
  const decodedWaveform = useMemo(
    () => (waveform && !vertical ? decodeWaveform(waveform) : null),
    [waveform, vertical],
  )
  const hasWaveform = !!decodedWaveform
  const tintKey = tintColors?.join(',')

  /**
   * Prerender the dim and vivid wave layers whenever the data, tint, or the
   * scrubber's size changes.
   */
  useEffect(() => {
    if (!decodedWaveform) {
      waveformLayersRef.current = null
      return
    }

    const scrubberEl = scrubberRef.current as HTMLElement
    const canvas = waveformCanvasRef.current
    if (!scrubberEl || !canvas) {
      return
    }

    const render = () => {
      const rect = scrubberEl.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return
      }

      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)

      const computedStyle = getComputedStyle(scrubberEl)
      const accentColor = computedStyle.getPropertyValue('--accent-color')
      const mutedColor = computedStyle.getPropertyValue('--bg-1')
      const palettes = deriveWaveformPalettes(tintColors, accentColor, mutedColor)

      const renderLayer = (palette: typeof palettes.vivid) => {
        const layer = document.createElement('canvas')
        layer.width = canvas.width
        layer.height = canvas.height
        const layerCtx = layer.getContext('2d')
        layerCtx.scale(dpr, dpr)
        drawWaveformWave(layerCtx, decodedWaveform, rect.width, rect.height, palette)
        return layer
      }

      waveformLayersRef.current = {
        vivid: renderLayer(palettes.vivid),
        dim: renderLayer(palettes.dim),
      }
      setWaveformPaintTick((tick) => tick + 1)
    }

    render()
    const observer = new ResizeObserver(render)
    observer.observe(scrubberEl)
    return () => observer.disconnect()
  }, [decodedWaveform, tintKey])

  /**
   * Repaint the visible canvas as the playhead and buffered range move.
   */
  useEffect(() => {
    const canvas = waveformCanvasRef.current
    const layers = waveformLayersRef.current
    if (!canvas || !layers) {
      return
    }

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const cssWidth = canvas.width / dpr
    const cssHeight = canvas.height / dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const bufferedX = max > 0 ? Math.min(1, buffered / max) * cssWidth : 0
    compositeWaveform(ctx, layers.dim, layers.vivid, cssWidth, cssHeight, offset ?? 0, bufferedX)
  }, [offset, buffered, max, waveformPaintTick])

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

    // Vertical runs bottom-to-top, so the offset is measured up from the bottom edge
    if (vertical) {
      const pageY = e?.pageY
        ? e.pageY
        : e?.changedTouches?.[0] ? e.changedTouches[0]?.pageY : 0
      let offset = scrubberBox.bottom - pageY

      // Clamp
      if (offset < 0) offset = 0
      if (offset > scrubberBox.height) offset = scrubberBox.height

      const percent = (offset / scrubberBox.height) * 100
      const value = min + ((max - min) * (percent / 100))

      return { value, percent, offset }
    }

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
      const length = vertical ? scrubberBox.height : scrubberBox.width
      setOffset(length * percent)
    }
  }, [value])

  return (
    <div
      ref={scrubberRef}
      className={clsx("scrubber", vertical && 'vertical', hasWaveform && 'has-waveform', className)}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="scrubber-bar">
        <div
          className="scrubber-bar-buffered"
          style={{
            [vertical ? 'height' : 'width']: `${max > 0 ? Math.min(100, (buffered / max) * 100) : 0}%`,
          }}
        />
        <div
          className="scrubber-bar-fill"
          style={{
            [vertical ? 'height' : 'width']: offset,
          }}
        />
      </div>
      {hasWaveform &&
        <canvas ref={waveformCanvasRef} className="scrubber-waveform" />
      }
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
          [vertical ? 'bottom' : 'left']: offset,
        }}
      />
    </div>
  )
}

export default Scrubber
