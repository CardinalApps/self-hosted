import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Toolbar from '@cardinalapps/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '@cardinalapps/ui/src/components/interaction/Toolbar/types'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'
import { MusicAritstsOrderBy } from '@cardinalapps/ui/src/store/apis/musicArtists'

import ArtistsInfiniteScroll from './ArtistsInfiniteScroll'

import i18n from './i18n.json'

import './styles.css'

const TOOLBAR_NAME = 'music-artists-toolbar'
const VIRTUAL_VIEW_NAME = 'artists-page'

function ArtistsPage() {
  return (
    <AppPage
      layout={PAGE_LAYOUT.virtual}
      pageTitle={i18n['music-artists.title']['en']}
      restoreScrollPoint={false}
      capabilities={['MusicArtists.Read']}
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
              initialValue: 'name',
              options: [
                'name',
                'createdAt',
              ] as MusicAritstsOrderBy[],
            },
            {
              slug: ToolbarItem.RESET,
              render: ToolbarItem.RESET,
            },
          ]}
        />
      )}
    >
      <ArtistsInfiniteScroll
        virtualViewName={VIRTUAL_VIEW_NAME}
        toolbarName={TOOLBAR_NAME}
      />
    </AppPage>
  )
}

export default ArtistsPage
