import { useSelector } from 'react-redux'

import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'

import { useGetVersionsQuery } from '@cardinalapps/ui/src/store/apis/versions'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import BrandLogo, { BrandLogoIcon } from '@cardinalapps/ui/src/components/layout/BrandLogo/BrandLogo'

import i18n from './i18n.json'
import './styles.css'

function WidgetApps() {
  const { lang, open_apps_in_new_tab } = useSelector(settingsSelectors.current)
  const versionsQuery = useGetVersionsQuery({})
  const { data = {} } = versionsQuery

  return (
    <CardGrid.Card
      size="s"
      icon={<Icon fa="fas fa-window-maximize" />}
      header={
        <>
          <H5>{i18n['apps.title'][lang]}</H5>
        </>
      }
    >
      <div className={'apps'}>
        {['admin', 'music', 'photos', 'cinema'].map((appName: BrandLogoIcon) => {
          return (
            <div className={'app'} key={appName}>
              <a href={`/${appName}`} target={open_apps_in_new_tab ? '_blank' : undefined} title={i18n[`app.title.${appName}`][lang]}>
                <BrandLogo className={'brandLogo'} icon={appName} size="xs" />
                <div className="app-meta">
                  <p className={'name'}>{i18n[`app.name.${appName}`]['en']}</p>
                  <p className={'version'}>v{data?.[`cardinal_${appName}_web_app`]}</p>
                </div>
              </a>
            </div>
          )
        })}
      </div>
    </CardGrid.Card>
  )
}

export default WidgetApps
