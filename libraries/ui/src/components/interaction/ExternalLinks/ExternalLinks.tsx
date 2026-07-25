import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import MenuButton from '../MenuButton'
import Popout from '../../layout/Popout'
import Icon from '../../typography/Icon'
import { settingsSelectors } from '../../../store/slices/settings'

import { providerLogos, providerNames } from './logos'
import { buildExternalLinks, type ExternalIds } from './providers'

import i18n from './i18n'

import './ExternalLinks.css'

type ExternalLinksProps = {
  ids: ExternalIds
  /** Rendered instead of nothing when no identifier is present. Off by default. */
  showWhenEmpty?: boolean
  align?: string
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
  align = 'left',
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
      position="tl"
      origin="bl"
      offset={6}
      width={240}
      trigger={(
        <MenuButton
          open={isOpen}
          onOpenChange={setIsOpen}
          align={align}
          icon={<Icon fa="fas fa-external-link-alt" />}
          title={title}
        />
      )}
    >
      <p className="external-links-title">{title}</p>

      {!links.length && (
        <p className="external-links-empty">{i18n['external-links.empty'][lang]}</p>
      )}

      <ul className="external-links-list">
        {links.map((link) => {
          const Logo = providerLogos[link.providerId]

          return (
            <li key={link.id}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => setIsOpen(false)}
              >
                <span className="external-links-logo">
                  <Logo />
                </span>
                <span className="external-links-label">
                  <span className="external-links-provider">{providerNames[link.providerId]}</span>
                  <span className="external-links-kind">{i18n[link.labelKey][lang]}</span>
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
