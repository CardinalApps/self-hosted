import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'
import ListenNowProcedural from './ListenNowProcedural'
import Toolbar from '../../../../../libraries/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '../../../../../libraries/ui/src/components/interaction/Toolbar/types'

import './styles.css'

import i18n from './i18n.json'

const TOOLBAR_NAME = 'explore-music-toolbar'

function ListenNow() {
  return (
    <AppPage
      layout={PAGE_LAYOUT.procedural}
      pageTitle={i18n['title']['en']}
      restoreScrollPoint={false}
      showLibrarySwitcher={true}
      capabilities={['MusicHistory.Read']}
      toolbar={(
        <Toolbar
          name={TOOLBAR_NAME}
          items={[[
            {
              slug: ToolbarItem.BREADCRUMBS,
              render: ToolbarItem.BREADCRUMBS,
            },
          ]]}
        />
      )}
    >
      <div className="listen-now">
        <ListenNowProcedural />
      </div>
    </AppPage>
  )
}

export default ListenNow
