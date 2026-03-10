import { useSelector } from 'react-redux'

import Thumb from '@cardinalapps/ui/src/components/interaction/Thumb'

// import usePhoto from '@cardinalapps/ui/src/hooks/usePhoto'

import { PhotoObject, PhotoViewerProps } from '@cardinalapps/ui/src/components/features/PhotoViewer/PhotoViewer'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'

import '../styles.css'

export const MISSING_IMAGE_WIDTH = 190

const QUERY_PARAM_CURRENT_PHOTOVIEWER = 'p'

const BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAIAAAD2HxkiAAADXklEQVR4nOzTQQkAIADAQBH71zKAYB5j7OFdgn229j0D6Mw6AH5nQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiLwAA//9Y4ATLSxfvhwAAAABJRU5ErkJggg=="

type MissingImageProps = {
  photo: PhotoObject,
  selectedPhotos: number[],
  handlePhotoSelected: (id: number) => void,
  handlePhotoDeselected: (id: number) => void,
  photoViewerProps: PhotoViewerProps,
}

/**
 * Fallback thumbnail for when the server doesn't provide a thumbnail.
 */
function MissingImage({
  photo,
  selectedPhotos,
  handlePhotoSelected,
  handlePhotoDeselected,
  photoViewerProps,
}: MissingImageProps) {
  const { lang } = useSelector(settingsSelectors.current)
  const url = new URL(window.location.href)
  const timeString = new Date(photo?.takenAt).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
  const isInitiallyOpen = url.searchParams.get(QUERY_PARAM_CURRENT_PHOTOVIEWER) === photo.photoId
  // const { fetchPhoto } = usePhoto()
  // const [fullSizedPhoto, setFullSizedPhoto] = useState()

  // useEffect(() => {
  //   if (!fullSizedPhoto) {
  //     fetchPhoto(photo.id)
  //       .then((res) => {
  //         setFullSizedPhoto(res?.src)
  //       })
  //   }
  // }, [])

  return (
    <div className={'missingImage'}>
      <div className={'missingImageMessage'}>
        <p><i className="fas fa-image" /></p>
        <div dangerouslySetInnerHTML={{ __html: i18n['missing-image'][lang] }} />
      </div>
      <Thumb
        w={`${MISSING_IMAGE_WIDTH}px`}
        h={`100%`}
        src={BASE64}
        selectable={true}
        lazyLoad={false}
        peek={false}
        onSelect={() => handlePhotoSelected(photo.id)}
        onDeselect={() => handlePhotoDeselected(photo.id)}
        selected={!!selectedPhotos.includes(photo.id)}
        photoViewerInitiallyOpen={isInitiallyOpen}
        photoViewerProps={photoViewerProps}
      >
        <p className={'peekMetadata'}>{timeString}</p>
      </Thumb>
    </div>
  )
}

export default MissingImage
