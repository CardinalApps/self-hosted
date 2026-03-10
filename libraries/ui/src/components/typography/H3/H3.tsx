import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './H3.css'

type H3Props = {
  className?: string,
}

/**
 * Heading level 3.
 */
const H3 = (props: PropsWithChildren<H3Props>) => {
  return (
    <h3 className={clsx('h3', props.className)}>{props.children}</h3>
  )
}

export default H3
