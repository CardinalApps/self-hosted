import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './H6.css'

type H6Props = {
  className?: string,
}

/**
 * Heading level 6.
 */
const H6 = (props: PropsWithChildren<H6Props>) => {
  return (
    <h6 className={clsx('h6', props.className)}>{props.children}</h6>
  )
}

export default H6
