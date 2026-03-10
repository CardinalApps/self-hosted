import { useSelector } from 'react-redux'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'

import WidgetServer from './WidgetServer'
import WidgetActiveUsers from './WidgetActiveUsers'
import WidgetApps from './WidgetApps'

import i18n from './i18n.json'
import './styles.css'

function Overview() {
  const { lang } = useSelector(settingsSelectors.current)
  return (
    <AppPage layout={PAGE_LAYOUT.standard} pageTitle={i18n['title'][lang]}>
      <CardGrid rowHeight='l'>
        <WidgetServer />
        <WidgetApps />
        <WidgetActiveUsers />
      </CardGrid>
    </AppPage>
  )
}

export default Overview
