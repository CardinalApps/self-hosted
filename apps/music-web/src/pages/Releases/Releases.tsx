import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Toolbar from '@cardinalapps/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '@cardinalapps/ui/src/components/interaction/Toolbar/types'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'

import ReleasesInfiniteScroll from './ReleasesInfiniteScroll'

import i18n from './i18n.json'

import './styles.css'

const TOOLBAR_NAME = 'releases-toolbar'
const VIRTUAL_VIEW_NAME = 'releases-page'

function ReleasesPage() {
  return (
    <AppPage
      layout={PAGE_LAYOUT.virtual}
      pageTitle={i18n['music-releases.title']['en']}
      restoreScrollPoint={false}
      capabilities={['MusicReleases.Read']}
      showLibrarySwitcher={true}
      toolbar={(
        <Toolbar
          name={TOOLBAR_NAME}
          virtualViewName={VIRTUAL_VIEW_NAME}
          items={[
            {
              slug: 'order',
              render: ToolbarItem.ORDER,
            },
            {
              slug: 'sort',
              render: ToolbarItem.SORT,
              initialValue: 'title',
              options: [
                {
                  label: i18n['music-releases.order-by.title']['en'],
                  value: 'title',
                },
                // {
                //   label: 'Random',
                //   value: 'random',
                // },
              ],
            },
          ]}
        />
      )}
    >
      <ReleasesInfiniteScroll
        virtualViewName={VIRTUAL_VIEW_NAME}
        toolbarName={TOOLBAR_NAME}
      />
    </AppPage>
  )
}

export default ReleasesPage
