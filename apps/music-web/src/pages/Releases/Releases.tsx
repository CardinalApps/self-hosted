import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Toolbar from '@cardinalapps/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '@cardinalapps/ui/src/components/interaction/Toolbar/types'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'
import { MusicReleasesOrderBy } from '@cardinalapps/ui/src/store/apis/musicReleases'

import ReleasesInfiniteScroll from './ReleasesInfiniteScroll'

import i18n from './i18n.json'

import './styles.css'

const TOOLBAR_NAME = 'music-releases-toolbar'
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
              slug: ToolbarItem.BREADCRUMBS,
              render: ToolbarItem.BREADCRUMBS,
            },
            {
              slug: ToolbarItem.VIRTUALLAYOUT,
              render: ToolbarItem.VIRTUALLAYOUT,
            },
            {
              slug: 'order',
              render: ToolbarItem.ORDER,
            },
            {
              slug: 'orderBy',
              render: ToolbarItem.ORDERBY,
              initialValue: 'title',
              options: [
                'title',
                'createdAt',
              ] as MusicReleasesOrderBy[],
            },
            {
              slug: ToolbarItem.RESET,
              render: ToolbarItem.RESET,
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
