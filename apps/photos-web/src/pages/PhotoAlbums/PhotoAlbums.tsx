import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Loading from '@cardinalapps/ui/src/components/layout/Loading'
import CreateSomething from '@cardinalapps/ui/src/components/interaction/CreateSomething'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'

import PhotoAlbum from '../../components/PhotoAlbum'
import NoContentMessage from '../../components/NoContentMessage'

import {
  useGetPhotoAlbumsQuery,
  useCreatePhotoAlbumMutation,
} from '@cardinalapps/ui/src/store/apis/photoAlbums'

import i18n from './i18n.json'
import './styles.css'

import { HOME_SERVER_HOST } from '../../env'
import HasCapabilities from '@cardinalapps/ui/src/components/layout/HasCapabilities'

const defaults = {
  take: 10000,
  skip: 0,
  order: 'desc',
}

function PhotoAlbumsPage() {
  const dispatch = useDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const [createPhotoAlbum, createPhotoAlbumResult] = useCreatePhotoAlbumMutation()
  // const [deletePhotoAlbum, deletePhotoAlbumResult] = useDeletePhotoAlbumMutation()
  const { data, isFetching, isLoading/*, refetch*/ } = useGetPhotoAlbumsQuery({
    take: defaults.take,
    skip: defaults.skip,
    order: defaults.order,
  })
  const [photosAlbums = [], totalPhotoAlbums] = data || []

  /**
   * Creates a new photo album.
   */
  const handleNewPhotoAlbumSubmit = (name) => {
    if (typeof name === 'string' && name) {
      createPhotoAlbum({ name })
    }
  }

  /**
   * Todo
   */
  // const handleDeleteClick = (e) => {
  //   e.preventDefault()
  //   deletePhotoAlbum({ id: photoAlbumId })
  // }

  /**
   * After photo album creation, for both pass or fail.
   */
  useEffect(() => {
    if (createPhotoAlbumResult.isSuccess) {
      // noop
    } else if (createPhotoAlbumResult.isError) {
      dispatch(toastActions.addToQueue({
        ttl: 5000,
        title: i18n['create-album.error'][lang],
        type: 'danger',
      }))
    }
  }, [createPhotoAlbumResult])

  return (
    <AppPage
      layout={PAGE_LAYOUT.standard}
      pageTitle={i18n['title']['en']}
      capabilities={['PhotoAlbums.Read', 'Photos.Read']}
    >
      <HasCapabilities capabilities={['PhotoAlbums.Create']}>
        <CreateSomething
          fieldLabel={i18n['create-album.name'][lang]}
          onSubmit={(name) => handleNewPhotoAlbumSubmit(name)}
        />
      </HasCapabilities>
      <section>
        {isLoading || isFetching
          ? <div className="pageLoading">
              <Loading />
            </div>
          : null
        }
        {!isLoading && !isFetching && !totalPhotoAlbums
          ? <NoContentMessage
              icon={<i className="fas fa-upload" />}
              title={i18n['no-albums-card-title']['en']}
              button={
                <Button href={`${HOME_SERVER_HOST}/admin/media`} target="_blank" solid={true}>
                  {i18n['no-albums-button']['en']}
                </Button>
              }
            >
              <p>{i18n['no-albums-card-message']['en']}</p>
            </NoContentMessage>
          : <section className="photoAlbumsList">
              {photosAlbums.map((photoAlbum, i) => {
                return (
                  <PhotoAlbum
                    key={`${photoAlbum?.name}-${i}`}
                    id={photoAlbum.id}
                    name={photoAlbum?.name}
                    count={photoAlbum?.numEntries}
                  />
                )
              })}
            </section>
        }
      </section>
    </AppPage>
  )
}

export default PhotoAlbumsPage
