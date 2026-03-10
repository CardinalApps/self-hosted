import type { PropsWithChildren } from 'react'

import './WrittenText.css'

type WrittenTextProps = {
  className?: string,
  dangerouslySetInnerHTML?: { __html: string },
}

/**
 * A wrapper for blobs of content produced by rich text editors.
 */
const WrittenText = ({ children, ...args }: PropsWithChildren<WrittenTextProps>) => {
  return typeof children === 'string'
    ? <section
        {...args}
        className={`written-text ${args?.className}`}
        dangerouslySetInnerHTML={{ __html: children }}
      />
    : <section
        {...args}
        className={`written-text ${args?.className}`}
      >
        {children}
      </section>
}

export default WrittenText
