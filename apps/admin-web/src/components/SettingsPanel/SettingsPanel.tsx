import { useSelector } from 'react-redux'

import SettingsPanel from '@cardinalapps/ui/src/components/features/SettingsPanel'
import { CardinalApp } from '@cardinalapps/ui/src/lib/env/cardinal'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import Reporting from './custom-pages/Reporting'

import i18n from './i18n.json'

import './styles.css'

/**
 * Custom settings pages for the Media Server.
 */
function HomeServerSettingsPanel() {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <SettingsPanel
      app={CardinalApp.ADMIN}
      lang="en"
      customTabs={[
        {
          tabName: i18n['reporting.tab.name'][lang],
          tabIcon: 'fas fa-bullhorn',
          tabContent: <Reporting />,
        },
      ]}
    />
  )
}

export default HomeServerSettingsPanel
