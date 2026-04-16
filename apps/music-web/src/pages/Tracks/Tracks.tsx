import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Toolbar from '@cardinalapps/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '@cardinalapps/ui/src/components/interaction/Toolbar/types'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'
import { MusicTracksOrderBy } from '@cardinalapps/ui/src/store/apis/musicTracks'

import TracksInfiniteScroll from './TracksInfiniteScroll'

import i18n from './i18n.json'

import './styles.css'

const TOOLBAR_NAME = 'tracks-toolbar'
const VIRTUAL_VIEW_NAME = 'tracks-page'

function TracksPage() {
  return (
    <AppPage
      layout={PAGE_LAYOUT.virtual}
      pageTitle={i18n['music-tracks.title']['en']}
      restoreScrollPoint={false}
      capabilities={['MusicTracks.Read']}
      showLibrarySwitcher={true}
      toolbar={(
        <Toolbar
          name={TOOLBAR_NAME}
          virtualViewName={VIRTUAL_VIEW_NAME}
          items={[[
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
                'playCount',
                'trackNumber',
                'duration',
                'bitrate',
              ] as MusicTracksOrderBy[],
            },
            {
              slug: ToolbarItem.RESET,
              render: ToolbarItem.RESET,
            },
          ]]}
        />
      )}
    >
      <TracksInfiniteScroll
        virtualViewName={VIRTUAL_VIEW_NAME}
        toolbarName={TOOLBAR_NAME}
      />
    </AppPage>
  )
}

export default TracksPage
