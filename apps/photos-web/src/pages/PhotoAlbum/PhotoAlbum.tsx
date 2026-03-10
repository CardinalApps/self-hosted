import { useMatch, Link } from 'react-router-dom'
import ms from 'ms'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import H1 from '@cardinalapps/ui/src/components/typography/H1'
import Loading from '@cardinalapps/ui/src/components/layout/Loading'

import {
  useGetPhotoAlbumQuery,
} from '@cardinalapps/ui/src/store/apis/photoAlbums'
import { queryParams } from '@cardinalapps/ui/src/lib/net/queryParams'

import NoContentMessage from '../../components/NoContentMessage'
import VirtualPhotoList from '../../components/VirtualPhotoList'

import useLargeData from '../../hooks/useLargeData'

import i18n from './i18n.json'

import * as routes from '../../routes'

import './styles.css'

function PhotoAlbumPage() {
  const { params: { id: photoAlbumId } } = useMatch(routes.PHOTO_ALBUM)
  const { data: photoAlbumData = {} } = useGetPhotoAlbumQuery({ photoAlbumId })
  const { data: photoAlbumEntries, isLoading } = useLargeData([], queryParams(`/photo-album/${photoAlbumId}/entries`, {
    joinPhoto: true,
  }),
  {
    expiration: ms('8 seconds'),
  })
  const photos = photoAlbumEntries.map((entry) => entry.photo)

  return (
    <AppPage
      restoreScrollPoint={false}
      capabilities={['Photos.Read']}
    >
      <div className="album">
        <header className="header">
          <div className="photoAlbum">
            <H1 className="title">{photoAlbumData.name}</H1>
          </div>
        </header>
        <div className="photoList">
          {isLoading &&
            <div className="loading"><Loading /></div>
          }
          {!isLoading && !!photoAlbumEntries.length &&
            <div className="infinitePhotos">
              <VirtualPhotoList data={photos} listClassName="virtualList" />
            </div>
          }
          {!isLoading && !photoAlbumEntries.length &&
            <NoContentMessage
              icon={<i className="fas fa-photo-video" />}
              title={i18n['no-content-message.title']['en']}
              button={
                <Link to={routes.ROOT} className="button solid">
                  {i18n['no-content-message.button']['en']}
                </Link>
              }
            >
              <p>{i18n['no-content-message.desc']['en']}</p>
            </NoContentMessage>
          }
        </div>
      </div>
    </AppPage>
  )
}

export default PhotoAlbumPage
