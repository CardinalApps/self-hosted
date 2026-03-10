import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './H2.css'

type H2Props = {
  className?: string,
}

/**
 * Heading level 2.
 */
const H2 = (props: PropsWithChildren<H2Props>) => {
  return (
    <h2 className={clsx('h2', props.className)}>{props.children}</h2>
  )
}

export default H2
