import type { PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'

import { settingsSelectors } from '../../../store/slices/settings'

import MenuButton from '../MenuButton'
import BrandLogo from '../../layout/BrandLogo'

import i18n from './i18n'

import './AppMenu.css'

type AppMenuProps = {
  align: 'left' | 'center' | 'right',
  target?: '_blank',
}

/**
 * AppMenu.
 */
const AppMenu = ({
  align = 'center',
  target,
}: PropsWithChildren<AppMenuProps>) => {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <MenuButton solid={false} align={align} size="m" title={i18n['icon.title'][lang]} icon={<i className="fas fa-th" />}>
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
    </MenuButton>
  )
}

export default AppMenu
