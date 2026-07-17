import { useMatch, Link } from 'react-router-dom'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import PhotoViewer from '@cardinalapps/ui/src/components/features/PhotoViewer'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'

import usePhoto from '@cardinalapps/ui/src/hooks/usePhoto'

import NoContentMessage from '../../components/NoContentMessage'

import * as routes from '../../routes'

import i18n from './i18n.json'
import './styles.css'
import type { PhotoType } from '@cardinalapps/ui/src/components/features/PhotoViewer/PhotoViewer'

export default function Photo() {
  // const { params: { id: photoId } } = useMatch(routes.PHOTO)
  // const { photoObj, photoError } = usePhoto(photoId)

  return (
    <AppPage capabilities={['Photos.Read']}>
      {/* <div className="photoPage">
        {photoObj &&
          <PhotoViewer
            photos={[photoObj as PhotoType]}
            usePortal={true}
            photoErrorMessage={photoError?.message}
          />
        }
      </div> */}
      <section>
        <NoContentMessage
          showUnavailableMessage={true}
          icon={<Icon fa="fas fa-image" />}
          title={i18n['no-photo-card-title']['en']}
          button={
            <Link to={routes.ROOT} className="button solid">
              {i18n['no-photo-button']['en']}
            </Link>
          }
        >
          <p>{i18n['no-photo-card-message']['en']}</p>
        </NoContentMessage>
      </section>
    </AppPage>
  )
}
