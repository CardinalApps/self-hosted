import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './H4.css'

type H1Props = {
  title?: string,
  className?: string,
  id?: string,
}

/**
 * Heading level 4.
 */
const H4 = (props: PropsWithChildren<H1Props>) => {
  return (
    <h4
      id={props?.id}
      className={clsx('h4', props.className)}
      title={props.title}
    >
        {props.children}
      </h4>
  )
}

export default H4
