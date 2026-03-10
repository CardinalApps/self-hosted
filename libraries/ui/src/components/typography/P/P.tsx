import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './P.css'

type PProps = {
  className?: string,
  truncate?: boolean,
}

/**
 * Paragraph tag.
 */
const P = ({ truncate = false, className, children }: PropsWithChildren<PProps>) => {
  return (
    <p className={clsx('p', className, truncate && 'truncate')}>{children}</p>
  )
}

export default P
