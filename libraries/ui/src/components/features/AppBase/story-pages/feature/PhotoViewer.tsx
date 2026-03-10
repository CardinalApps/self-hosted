import AppPage from '../../AppPage'

import Thumb from '../../../../interaction/Thumb'

import { PAGE_LAYOUT } from '../../../../../store/slices/layout'

function PhotoViewer() {
  return (
    <AppPage layout={PAGE_LAYOUT.standard} pageTitle="Feature: PhotoViewer">
      <div style={{ display: 'flex', gap: 10 }}>
        <Thumb
          w="200px"
          h="160px"
          src="/sample/images/thumbs/swirl.jpg"
          peekImage="/sample/images/original/swirl.jpg"
          peekLeftMax={300}
          photoViewerProps={{
            photos: ['/sample/images/original/swirl.jpg', '/sample/images/original/jellyfish.jpg', '/sample/images/original/face.jpg'],
            initialPhotoIndex: 0,
          }}
        />
        <Thumb
          w="200px"
          h="160px"
          src="/sample/images/thumbs/jellyfish.jpg"
          peekImage="/sample/images/original/jellyfish.jpg"
          peekLeftMax={300}
          photoViewerProps={{
            photos: ['/sample/images/original/swirl.jpg', '/sample/images/original/jellyfish.jpg', '/sample/images/original/face.jpg'],
            initialPhotoIndex: 1,
          }}
        />
        <Thumb
          w="200px"
          h="160px"
          src="/sample/images/thumbs/face.jpg"
          peekImage="/sample/images/original/face.jpg"
          peekLeftMax={300}
          photoViewerProps={{
            photos: ['/sample/images/original/swirl.jpg', '/sample/images/original/jellyfish.jpg', '/sample/images/original/face.jpg'],
            initialPhotoIndex: 2,
          }}
        />
      </div>
    </AppPage>
  )
}

export default PhotoViewer
