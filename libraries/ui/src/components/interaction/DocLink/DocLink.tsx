import type { PropsWithChildren } from 'react'

import Icon from '../../typography/Icon'

import './DocLink.css'

type DocLinkProps = {
  title?: string,
  href?: string,
}

/**
 * Icon.
 */
const DocLink = ({
  title,
  href,
}: PropsWithChildren<DocLinkProps>) => {
  return (
    <Icon
      href={`https://help.cardinalapps.io${href}`}
      title={title}
      className="doc-link"
      target="_blank"
      fa="fas fa-book"
    />
  )
}

export default DocLink

