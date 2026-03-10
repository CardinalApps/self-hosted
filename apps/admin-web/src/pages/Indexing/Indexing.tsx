import { useSelector } from 'react-redux'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import NewRun from './sections/NewRun'
import OverallProgress from './sections/OverallProgress'
import MediaProgress from './sections/MediaProgress'
import Files from './sections/Files'
import Folders from './sections/Folders'
import RunsHistory from './sections/RunsHistory'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout'

import i18n from './i18n.json'
import './styles.css'

function Indexing() {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <AppPage
      layout={PAGE_LAYOUT.standard}
      pageTitle={i18n['title'][lang]}
      capabilities={['Indexing.Read']}
    >
      <CardGrid rowHeight='l' className='indexing'>
        <NewRun />
        <OverallProgress />
        <MediaProgress />
        <Files />
        <Folders />
        <RunsHistory />
      </CardGrid>
    </AppPage>
  )
}

export default Indexing
