import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './Span.css'

type SpanProps = {
  className?: string,
  truncate?: boolean,
}

/**
 * Span tag.
 */
const Span = ({ truncate = false, className, children }: PropsWithChildren<SpanProps>) => {
  return (
    <span className={clsx('span', className, truncate && 'truncate')}>{children}</span>
  )
}

export default Span
