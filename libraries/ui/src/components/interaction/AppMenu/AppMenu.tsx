import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import { settingsSelectors } from '../../../store/slices/settings'

import Popout from '../../layout/Popout'
import type { PopoutAnchor } from '../../layout/Popout'
import BrandLogo from '../../layout/BrandLogo'
import Icon from '../../typography/Icon'

import i18n from './i18n'

import './AppMenu.css'

type AppMenuProps = {
  align: 'left' | 'center' | 'right',
  target?: '_blank',
}

const ALIGN_TO_ANCHOR: Record<AppMenuProps['align'], { position: PopoutAnchor, origin: PopoutAnchor }> = {
  left: { position: 'tl', origin: 'bl' },
  center: { position: 'tc', origin: 'bm' },
  right: { position: 'tr', origin: 'br' },
}

/**
 * AppMenu.
 */
const AppMenu = ({
  align = 'center',
  target,
}: PropsWithChildren<AppMenuProps>) => {
  const { lang } = useSelector(settingsSelectors.current)
  const [isOpen, setIsOpen] = useState(false)
  const { position, origin } = ALIGN_TO_ANCHOR[align]

  return (
    <Popout
      open={isOpen}
      onClose={() => setIsOpen(false)}
      position={position}
      origin={origin}
      offset={10}
      width={230}
      title={i18n['icon.title'][lang]}
      trigger={
        <button
          className={clsx('app-menu-trigger', { open: isOpen })}
          type="button"
          title={i18n['icon.title'][lang]}
          onClick={() => setIsOpen((o) => !o)}
        >
          <Icon fa="fas fa-th" />
        </button>
      }
    >
      <div className="app-menu">
        <div className="web-apps">
          <div>
            <a href="/admin" target={target} title={i18n['app.titleAttr.admin']['en']}>
              <BrandLogo icon={'admin'} size="m" />
              <div className="app-meta">
                <h6 className="app-name">{i18n['app.name.admin']['en']}</h6>
              </div>
            </a>
          </div>
          <div>
            <a href="/music" target={target} title={i18n['app.titleAttr.music']['en']}>
              <BrandLogo icon={'cardinal_music'} size="m" />
              <div className="app-meta">
                <h6 className="app-name">{i18n['app.name.music']['en']}</h6>
              </div>
            </a>
          </div>
          <div>
            <a href="/photos" target={target} title={i18n['app.titleAttr.photos']['en']}>
              <BrandLogo icon={'cardinal_photos'} size="m" />
              <div className="app-meta">
                <h6 className="app-name">{i18n['app.name.photos']['en']}</h6>
              </div>
            </a>
          </div>
          <div>
            <a href="/cinema" target={target} title={i18n['app.titleAttr.cinema']['en']}>
              <BrandLogo icon={'cardinal_cinema'} size="m" />
              <div className="app-meta">
                <h6 className="app-name">{i18n['app.name.cinema']['en']}</h6>
              </div>
            </a>
          </div>
        </div>
      </div>
    </Popout>
  )
}

export default AppMenu
