import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './H5.css'

type H5Props = {
  className?: string,
}

/**
 * Heading level 5.
 */
const H5 = (props: PropsWithChildren<H5Props>) => {
  return (
    <h5 className={clsx('h5', props.className)}>{props.children}</h5>
  )
}

export default H5
