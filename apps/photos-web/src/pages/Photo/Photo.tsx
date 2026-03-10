import { useMatch } from 'react-router-dom'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import PhotoViewer from '@cardinalapps/ui/src/components/features/PhotoViewer'

import usePhoto from '@cardinalapps/ui/src/hooks/usePhoto'

import * as routes from '../../routes'

import './styles.css'
import type { PhotoType } from '@cardinalapps/ui/src/components/features/PhotoViewer/PhotoViewer'

export default function Photo() {
  const { params: { id: photoId } } = useMatch(routes.PHOTO)
  const { photoObj, photoError } = usePhoto(photoId)

  return (
    <AppPage capabilities={['Photos.Read']}>
      <div className="photoPage">
        {photoObj &&
          <PhotoViewer
            photos={[photoObj as PhotoType]}
            usePortal={true}
            photoErrorMessage={photoError?.message}
          />
        }
      </div>
    </AppPage>
  )
}
