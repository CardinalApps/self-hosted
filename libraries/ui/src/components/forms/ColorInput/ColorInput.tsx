import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import clsx from 'clsx'

import RangeInput from '../RangeInput'

import { parseCssColor, serializeCssColor } from '../../../lib/color/parseCssColor'

import './ColorInput.css'

type ColorInputProps = {
  name?: string,
  // Any parseable CSS color: #rrggbb, rgb(), rgba()
  value?: string,
  // Adds an opacity slider; values with alpha < 1 are emitted as rgba()
  alpha?: boolean,
  size?: 'l' | 'm' | 's',
  className?: string,
  style?: CSSProperties,
  onChange?: (value: string) => void,
}

/**
 * Color input: swatch preview backed by the native color picker, plus a hex
 * text field, plus an optional opacity slider.
 */
const ColorInput = ({
  name,
  value = '#000000',
  alpha = false,
  size = 'l',
  className,
  style,
  onChange = () => {},
}: ColorInputProps) => {
  const parsed = parseCssColor(value) || { hex: '#000000', alpha: 1 }
  const [draftHex, setDraftHex] = useState(parsed.hex)

  /**
   * Track external value changes into the hex text field.
   */
  useEffect(() => {
    setDraftHex(parsed.hex)
  }, [value])

  // Commit a typed hex value, reverting the field if it isn't a valid color.
  const commitHex = (typed: string) => {
    const committed = parseCssColor(typed.trim())
    if (!committed) {
      setDraftHex(parsed.hex)
      return
    }

    setDraftHex(committed.hex)
    onChange(serializeCssColor(committed.hex, alpha ? parsed.alpha : 1))
  }

  return (
    <div className={clsx('color-input', className, `size-${size}`)} style={style}>
      <label className="swatch">
        <span className="swatch-color" style={{ backgroundColor: serializeCssColor(parsed.hex, parsed.alpha) }} />
        <input
          type="color"
          name={name}
          value={parsed.hex}
          onChange={(e) => onChange(serializeCssColor(e.target.value, alpha ? parsed.alpha : 1))}
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
          onChange={(percent) => onChange(serializeCssColor(parsed.hex, percent / 100))}
        />
      )}
    </div>
  )
}

export default ColorInput
