import { useState, type ReactNode } from 'react'
import clsx from 'clsx'

import Card from '../Card'

import './Beads.css'

export type BeadItem = {
  id?: string | number,
  /** Drives the bead's size, normalized against the other beads' values in this row. */
  value?: number,
  /** Overrides the value-driven size entirely. */
  size?: number,
  color?: string,
  borderColor?: string,
  textColor?: string,
  label?: ReactNode,
}

export type BeadsProps = {
  beads: BeadItem[],
  /** Size (width/height) of the smallest bead, and of any bead with no value. */
  size?: number,
  /** Gap between beads. */
  spacing?: number,
  /** The largest bead is at most this many times the size of the smallest. */
  maxSizeRatio?: number,
  color?: string,
  borderColor?: string,
  renderTooltip?: (bead: BeadItem, index: number) => ReactNode,
  className?: string,
}

/**
 * A horizontal row of small circles, one per data point, sized by value
 * relative to the row's own range. Used where a per-item count needs to read
 * as a shape at a glance rather than as a list of numbers.
 */
const Beads = ({
  beads,
  size = 14,
  spacing = 10,
  maxSizeRatio = 3,
  color = 'var(--accent-color)',
  borderColor = 'transparent',
  renderTooltip,
  className,
}: BeadsProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const values = beads
    .map((bead) => bead.size === undefined ? bead.value : undefined)
    .filter((value): value is number => typeof value === 'number' && value > 0)
  const minValue = values.length ? Math.min(...values) : 0
  const maxValue = values.length ? Math.max(...values) : 0

  const sizeFor = (bead: BeadItem) => {
    if (typeof bead.size === 'number') return bead.size
    if (typeof bead.value !== 'number' || bead.value <= 0 || minValue === maxValue) return size
    const scale = (bead.value - minValue) / (maxValue - minValue)
    return size + size * (maxSizeRatio - 1) * scale
  }

  return (
    <div className={clsx('beads', className)} style={{ gap: spacing }}>
      {beads.map((bead, index) => {
        const beadSize = sizeFor(bead)

        return (
          <div
            key={bead.id ?? index}
            className="bead-wrap"
            onMouseEnter={() => renderTooltip && setHoveredIndex(index)}
            onMouseLeave={() => renderTooltip && setHoveredIndex(null)}
          >
            <div
              className="bead"
              style={{
                width: beadSize,
                height: beadSize,
                backgroundColor: bead.color ?? color,
                borderColor: bead.borderColor ?? borderColor,
                color: bead.textColor,
              }}
            >
              {bead.label != null && <span className="bead-label">{bead.label}</span>}
            </div>

            {!!renderTooltip && hoveredIndex === index && (
              <Card className="bead-tooltip" bg={1} border={2} shadow={2} padding="thin">
                {renderTooltip(bead, index)}
              </Card>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default Beads
