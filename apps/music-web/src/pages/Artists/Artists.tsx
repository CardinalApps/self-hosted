import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Toolbar from '@cardinalapps/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '@cardinalapps/ui/src/components/interaction/Toolbar/types'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'
import { MusicAritstsOrderBy } from '@cardinalapps/ui/src/store/apis/musicArtists'

import ArtistsInfiniteScroll from './ArtistsInfiniteScroll'

import i18n from './i18n.json'

import './styles.css'

const TOOLBAR_NAME = 'artists-toolbar'
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
