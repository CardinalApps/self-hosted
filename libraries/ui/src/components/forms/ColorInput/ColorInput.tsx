import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import clsx from 'clsx'

import RangeInput from '../RangeInput'

import useThrottledCallback from '../../../hooks/useThrottledCallback'

import { parseCssColor, serializeCssColor } from '../../../lib/color/parseCssColor'

import './ColorInput.css'

type ColorInputProps = {
  name?: string,
  // Any parseable CSS color: #rrggbb, rgb(), rgba()
  value?: string,
  // Adds an opacity slider; values with alpha < 1 are emitted as rgba()
  alpha?: boolean,
  // Optional one-click shortcuts, keyed hex -> human readable name
  presets?: Record<string, string>,
  size?: 'l' | 'm' | 's',
  className?: string,
  style?: CSSProperties,
  onChange?: (value: string) => void,
}

// Colors are emitted at most this often while the native picker is being dragged
const EMIT_INTERVAL = 80

/**
 * Color input: swatch preview backed by the native color picker, plus a hex
 * text field, plus an optional opacity slider and preset swatches.
 */
const ColorInput = ({
  name,
  value = '#000000',
  alpha = false,
  presets,
  size = 'l',
  className,
  style,
  onChange = () => {},
}: ColorInputProps) => {
  const [draft, setDraft] = useState(value)
  const [draftHex, setDraftHex] = useState(() => parseCssColor(value)?.hex || '#000000')
  const lastEmitted = useRef<string | null>(null)

  const parsed = parseCssColor(draft) || { hex: '#000000', alpha: 1 }

  /*
   * Follow the prop, except when it's only the echo of our own last emit: dragging the native
   * picker runs ahead of whatever the consumer has stored, and accepting the echo would make the
   * color jump backwards mid-drag.
   */
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setDraft(value)
      setDraftHex(parseCssColor(value)?.hex || '#000000')
    }
  }, [value])

  const emit = useThrottledCallback((next: string) => {
    lastEmitted.current = next
    onChange(next)
  }, EMIT_INTERVAL)

  // Show the new color right away; the consumer hears about it at the throttled rate
  const apply = (next: string) => {
    setDraft(next)
    setDraftHex(parseCssColor(next)?.hex || draftHex)
    emit(next)
  }

  /*
   * Commit a typed hex value, reverting the field if it isn't a valid color. Only fires onChange
   * when the color actually changed - blurring an untouched field must not count as an edit
   * (edits can have side effects, eg. the theme editor forking a custom theme).
   */
  const commitHex = (typed: string) => {
    const committed = parseCssColor(typed.trim())
    if (!committed) {
      setDraftHex(parsed.hex)
      return
    }

    setDraftHex(committed.hex)
    if (committed.hex !== parsed.hex) {
      apply(serializeCssColor(committed.hex, alpha ? parsed.alpha : 1))
    }
  }

  return (
    <div className={clsx('color-input', className, `size-${size}`)} style={style}>
      <label className="swatch">
        <span className="swatch-color" style={{ backgroundColor: serializeCssColor(parsed.hex, parsed.alpha) }} />
        <input
          type="color"
          name={name}
          value={parsed.hex}
          onChange={(e) => apply(serializeCssColor(e.target.value, alpha ? parsed.alpha : 1))}
          onBlur={() => emit.flush()}
        />
      </label>
      <input
        type="text"
        className="hex"
        value={draftHex}
        spellCheck={false}
        onChange={(e) => setDraftHex(e.target.value)}
        onBlur={(e) => commitHex(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitHex((e.target as HTMLInputElement).value)
          }
        }}
      />
      {alpha && (
        <RangeInput
          min={0}
          max={100}
          unit="%"
          size="s"
          value={Math.round(parsed.alpha * 100)}
          onChange={(percent) => apply(serializeCssColor(parsed.hex, percent / 100))}
        />
      )}
      {!!presets && (
        <div className="presets">
          {Object.entries(presets).map(([hex, label]) => {
            const presetHex = parseCssColor(hex)?.hex || hex
            return (
              <button
                key={hex}
                type="button"
                title={label}
                aria-label={label}
                className={clsx('preset', presetHex === parsed.hex && 'active')}
                style={{ backgroundColor: presetHex }}
                onClick={() => apply(serializeCssColor(presetHex, alpha ? parsed.alpha : 1))}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ColorInput
