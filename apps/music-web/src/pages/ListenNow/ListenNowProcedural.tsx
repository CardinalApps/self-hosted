import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import ProceduralLayout from '@cardinalapps/ui/src/components/features/AppBase/layouts/Procedural'
import TrueShuffle from './items/TrueShuffle'
import RecentlyAddedReleases from './items/RecentlyAddedReleases'
import MostPlayedTracks from './items/MostPlayedTracks'

import i18n from './i18n.json'

function ListenNowProcedural() {
  const { lang } = useAppSelector(settingsSelectors.current)

  const listenNowLoadMore = () => {
    console.log('load more')
  }

  return (
    <ProceduralLayout
      name={'music-listen-now'}
      onLoadMore={listenNowLoadMore}
    >
      {
      /**
       * Page title.
       */
      }
      <ProceduralLayout.Title>
        {i18n['title'][lang]}
      </ProceduralLayout.Title>

      {
      /**
       * Action buttons.
       */
      }
      <ProceduralLayout.Block size='12x1'>
        <TrueShuffle />
      </ProceduralLayout.Block>

      {
      /**
       * Most listened tracks.
       */
      }
      <ProceduralLayout.Block size='6x4'>
        <MostPlayedTracks />
      </ProceduralLayout.Block>

      {
      /**
       * Recently added releases carousel.
       */
      }
      <ProceduralLayout.Block size='12x4' flush>
        <RecentlyAddedReleases />
      </ProceduralLayout.Block>
    </ProceduralLayout>
  )
}

export default ListenNowProcedural
