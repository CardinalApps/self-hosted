import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'
import ListenNowProcedural from './ListenNowProcedural'

import './styles.css'

function ListenNow() {
  return (
    <AppPage
      layout={PAGE_LAYOUT.procedural}
      restoreScrollPoint={false}
      showLibrarySwitcher={true}
      capabilities={['MusicHistory.Read']}
    >
      <div className="listen-now">
        <ListenNowProcedural />
      </div>
    </AppPage>
  )
}

export default ListenNow
