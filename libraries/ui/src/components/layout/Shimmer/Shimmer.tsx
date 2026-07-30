import type { CSSProperties } from 'react'
import clsx from 'clsx'

import './Shimmer.css'

type ShimmerProps = {
  className?: string,
  style?: CSSProperties,
  rounded?: boolean,
}

// An animated placeholder that fills its parent while the real content loads
const Shimmer = ({ className, style, rounded = true }: ShimmerProps) => {
  return (
    <div
      className={clsx('shimmer', rounded && 'rounded', className)}
      style={style}
      aria-hidden="true"
    />
  )
}

export default Shimmer
