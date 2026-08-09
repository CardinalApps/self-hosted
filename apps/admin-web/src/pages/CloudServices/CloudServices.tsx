import { useSelector } from 'react-redux'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import Toolbar from '@cardinalapps/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '@cardinalapps/ui/src/components/interaction/Toolbar/types'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'

import PopularityDataPool from './cards/PopularityDataPool'

import i18n from './i18n.json'
import './styles.css'

const TOOLBAR_NAME = 'admin-cloud-services'

function CloudServices() {
  const { lang } = useSelector(settingsSelectors.current)
  return (
    <AppPage
      layout={PAGE_LAYOUT.standard}
      pageTitle={i18n['title'][lang]}
      toolbar={(
        <Toolbar
          name={TOOLBAR_NAME}
          items={[
            [
              {
                slug: ToolbarItem.BREADCRUMBS,
                render: ToolbarItem.BREADCRUMBS,
              },
            ],
          ]}
        />
      )}
    >
      <CardGrid rowHeight='l'>
        <PopularityDataPool />
      </CardGrid>
    </AppPage>
  )
}

export default CloudServices
