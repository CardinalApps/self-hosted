import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import MenuButton from '../MenuButton'
import Popout from '../../layout/Popout'
import Icon from '../../typography/Icon'
import { settingsSelectors } from '../../../store/slices/settings'

import { providers } from './logos'
import { buildExternalLinks, type ExternalIds } from './providers'

import i18n from './i18n'

import './ExternalLinks.css'

// Wide enough for the longest label to stay on one line beside the widest logo
const POPOUT_WIDTH = 310

type ExternalLinksProps = {
  ids: ExternalIds
  /** Rendered instead of nothing when no identifier is present. Off by default. */
  showWhenEmpty?: boolean
  className?: string
}

/**
 * A menu of outbound links to the databases that know about this media, built
 * from whatever identifiers were found in the files' embedded metadata.
 *
 * Nothing is requested from any third party until the user clicks a link.
 */
const ExternalLinks = ({
  ids,
  showWhenEmpty = false,
  className,
}: ExternalLinksProps) => {
  const { lang } = useSelector(settingsSelectors.current)
  const [isOpen, setIsOpen] = useState(false)

  const links = useMemo(() => buildExternalLinks(ids), [ids])

  if (!links.length && !showWhenEmpty) {
    return null
  }

  const title = i18n['external-links.title'][lang]

  return (
    <Popout
      className={clsx('external-links', className)}
      innerClassName="external-links-popout"
      open={isOpen}
      onClose={() => setIsOpen(false)}
      position="tr"
      origin="br"
      offset={8}
      width={POPOUT_WIDTH}
      title={title}
      trigger={(
        <MenuButton
          open={isOpen}
          onOpenChange={setIsOpen}
          icon={<Icon fa="fas fa-bars" />}
          size="m"
          title={title}
        />
      )}
    >
      {!links.length && (
        <p className="external-links-empty">{i18n['external-links.empty'][lang]}</p>
      )}

      <ul className="external-links-list">
        {links.map((link) => {
          const { name, wordmark, logo: Logo } = providers[link.providerId]

          return (
            <li key={link.id}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => setIsOpen(false)}
              >
                <span className="external-links-provider">
                  {wordmark ? <Logo /> : (
                    <>
                      <span className="external-links-mark"><Logo /></span>
                      {name}
                    </>
                  )}
                </span>

                <span className="external-links-action">
                  {i18n[link.labelKey][lang]}
                  <i className="fas fa-external-link-alt" />
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </Popout>
  )
}

export default ExternalLinks
