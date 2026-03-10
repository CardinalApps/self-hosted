import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './H1.css'

type H1Props = {
  className?: string,
}

/**
 * Heading level 1.
 */
const H1 = (props: PropsWithChildren<H1Props>) => {
  return (
    <h1 className={clsx('h1', props.className)}>{props.children}</h1>
  )
}

export default H1
