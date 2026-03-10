import Thumb from '@cardinalapps/ui/src/components/interaction/Thumb'
import { PhotoObject, PhotoViewerProps } from '@cardinalapps/ui/src/components/features/PhotoViewer/PhotoViewer'
import { usePhotoThumbnail } from '@cardinalapps/ui/src/hooks/usePhotoThumbnail'

import '../styles.css'

const QUERY_PARAM_CURRENT_PHOTOVIEWER = 'p'

type VirtualPhotoListImageProps = {
  photo: PhotoObject,
  selectedPhotos: number[],
  handlePhotoSelected: (width: number) => void,
  handlePhotoDeselected: (width: number) => void,
  photoViewerProps: PhotoViewerProps,
}

/**
 * Image thumbnail.
 */
function VirtualPhotoListImage({
  photo,
  selectedPhotos,
  handlePhotoSelected,
  handlePhotoDeselected,
  photoViewerProps,
}: VirtualPhotoListImageProps) {
  const url = new URL(window.location.href)
  const thumb = photo?.thumbnail?.find((thumb) => thumb.size === 'small_nocrop')
  const timeString = new Date(photo?.takenAt).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
  const isInitiallyOpen = url.searchParams.get(QUERY_PARAM_CURRENT_PHOTOVIEWER) === photo.photoId
  const smallThumbBlob = usePhotoThumbnail(photo.photoId)
  const mediumThumbBlob = usePhotoThumbnail(photo.photoId, 'medium_nocrop')

  return (
    <Thumb
      w={`${thumb?.width}px`}
      h={`100%`}
      src={smallThumbBlob}
      selectable={true}
      lazyLoad={false}
      onSelect={() => handlePhotoSelected(photo.id)}
      onDeselect={() => handlePhotoDeselected(photo.id)}
      selected={!!selectedPhotos.includes(photo.id)}
      peekImage={mediumThumbBlob}
      peekTopMax={90}
      peekLeftMax={320}
      peekRightMax={window?.innerWidth - 60}
      photoViewerInitiallyOpen={isInitiallyOpen}
      photoViewerProps={photoViewerProps}
    >
      <p className={'peekMetadata'}>{timeString}</p>
    </Thumb>
  )
}

export default VirtualPhotoListImage
