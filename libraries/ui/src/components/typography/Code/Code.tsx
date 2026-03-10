import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './Code.css'

type CodeProps = {
  layout?: 'inline' | 'block',
  className?: string,
}

/**
 * Code tag.
 */
const Code = ({ layout = 'inline', className, children }: PropsWithChildren<CodeProps>) => {
  if (layout === 'inline') {
    return (
      <code className={clsx('inline-code', className)}>{children}</code>
    )
  } else {
    return (
      <pre className={clsx('block-code', className)}>{children}</pre>
    )
  }
}

export default Code
