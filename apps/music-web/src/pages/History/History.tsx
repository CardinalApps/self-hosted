import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Toolbar from '@cardinalapps/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '@cardinalapps/ui/src/components/interaction/Toolbar/types'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'

import MusicHistoryInfiniteScroll from './HistoryInfiniteScroll'

import i18n from './i18n.json'

import './styles.css'

const TOOLBAR_NAME = 'music-history-toolbar'
const VIRTUAL_VIEW_NAME = 'music-history-page'

function MusicHistoryPage() {
  return (
    <AppPage
      layout={PAGE_LAYOUT.virtual}
      pageTitle={i18n['music-history.title']['en']}
      restoreScrollPoint={false}
      capabilities={['MusicHistory.Read']}
      toolbar={(
        <Toolbar
          name={TOOLBAR_NAME}
          virtualViewName={VIRTUAL_VIEW_NAME}
          items={[
            {
              slug: 'order',
              render: ToolbarItem.ORDER,
              initialValue: 'DESC',
            },
          ]}
        />
      )}
    >
      <MusicHistoryInfiniteScroll
        virtualViewName={VIRTUAL_VIEW_NAME}
        toolbarName={TOOLBAR_NAME}
      />
    </AppPage>
  )
}

export default MusicHistoryPage
