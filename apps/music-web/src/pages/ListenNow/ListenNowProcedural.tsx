import ProceduralLayout from '@cardinalapps/ui/src/components/features/AppBase/layouts/Procedural'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import TrueShuffle from './items/TrueShuffle'
import HouseMix from './items/HouseMix'
import FreshMusic from './items/FreshMusic'
import FreshRelease from './items/FreshRelease'
import RecentlyAddedReleases from './items/RecentlyAddedReleases'
import MostPlayedTracks from './items/MostPlayedTracks'
import FavoriteTracks from './items/FavoriteTracks'
import ReleasesWithFavorites from './items/ReleasesWithFavorites'
import ArtistSpotlight from './items/ArtistSpotlight'
import RecentlyAddedArtists from './items/RecentlyAddedArtists'
import { useGetMusicTracksQuery } from '@cardinalapps/ui/src/store/apis/musicTracks'

import i18n from './i18n.json'

function ListenNowProcedural() {
  const { lang } = useAppSelector(settingsSelectors.current)

  /**
   * We need at least 1 track to show this page.
   */
  const {
    data,
    isSuccess,
  } = useGetMusicTracksQuery({
    take: 1,
  })

  const musicTracks = Array.isArray(data) ? data[0] : []

  const listenNowLoadMore = () => {
    console.log('load more')
  }

  return (
    <ProceduralLayout
      name={'music-listen-now'}
      onLoadMore={listenNowLoadMore}
      isReady={isSuccess}
      hasContent={!!musicTracks.length}
    >
      {
      /**
       * Action buttons.
       */
      }
      <ProceduralLayout.Block size='natural'>
        <div className="listen-now-actions">
          <HouseMix />
          <TrueShuffle />
          <FreshMusic />
          <FreshRelease />
        </div>
      </ProceduralLayout.Block>

      {
      /**
       * Most listened tracks.
       */
      }
      <ProceduralLayout.Block size='6x8'>
        <MostPlayedTracks />
      </ProceduralLayout.Block>

      {
      /**
       * Favorite tracks.
       */
      }
      <ProceduralLayout.Block size='6x8'>
        <FavoriteTracks />
      </ProceduralLayout.Block>

      {
      /**
       * Releases with favorites carousel.
       */
      }
      <ProceduralLayout.Block size='12x7' flush>
        <ReleasesWithFavorites />
      </ProceduralLayout.Block>

      {
      /**
       * Recently added releases carousel.
       */
      }
      <ProceduralLayout.Block size='12x7' flush>
        <RecentlyAddedReleases />
      </ProceduralLayout.Block>

      {
      /**
       * Artist spotlight.
       */
      }
      <ProceduralLayout.Block size='12x8'>
        <ArtistSpotlight />
      </ProceduralLayout.Block>

      {
      /**
       * Recently added artists grid.
       */
      }
      <ProceduralLayout.Block size='natural'>
        <RecentlyAddedArtists />
      </ProceduralLayout.Block>

      {
      /**
       * Fin.
       */
      }
      <ProceduralLayout.Block size='12x2'>
        <p className="listen-now-fin">{i18n['fin.message'][lang]}</p>
      </ProceduralLayout.Block>
    </ProceduralLayout>
  )
}

export default ListenNowProcedural
