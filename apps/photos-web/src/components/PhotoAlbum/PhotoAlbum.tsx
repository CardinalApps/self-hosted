import { useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

import Card from '@cardinalapps/ui/src/components/layout/Card'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import {
  useGetPhotoAlbumEntriesQuery,
  // useDeletePhotoAlbumMutation,
} from '@cardinalapps/ui/src/store/apis/photoAlbums'

import i18n from './i18n.json'

import * as routes from '../../routes'

import { HOME_SERVER_HOST } from '../../env'

import './styles.css'

type PhotoAlbumProps = {
  id: string,
  name: string,
  count: number,
}

function PhotoAlbum({ id, name, count }: PhotoAlbumProps) {
  const coverRef = useRef(null)
  const { theme, lang } = useSelector(settingsSelectors.current)
  const defaultCover = `/photos/images/${theme}/photo-album-cover-bg.png`
  const { data: featuredEntryData } = useGetPhotoAlbumEntriesQuery({
    photoAlbumId: id,
    featured: true,
  })
  const [featuredEntries = []] = featuredEntryData || []
  const cover = featuredEntries[0]?.photo?.thumbnail?.find((thumb) => thumb.size === 'medium_nocrop')?.relativeSrc

  useEffect(() => {
    if (coverRef.current && cover) {
      coverRef.current.setAttribute('style', `background-image: url(${HOME_SERVER_HOST}${cover});`)
    } else {
      coverRef.current.setAttribute('style', `background-image: url(${defaultCover});`)
    }
  }, [cover])

  return (
    <Card
      className={clsx("photoAlbum", cover ? "hasPhotoCover" : "hasDefaultCover")}
      border={1}
      shadow={2}
      padding="none"
    >
      <Link className="inner" to={`${routes.PHOTO_ALBUM.replace(':id', id)}`}>
        <header className="cover">
          <div className="bg" ref={coverRef} />
        </header>
        <div className="meta">
          <p className="name">{name}</p>
          <p className="count">
            {count === 1
              ? i18n['num-photos.singular'][lang].replace('{count}', count)
              : i18n['num-photos.plural'][lang].replace('{count}', count)
            }
          </p>
        </div>
      </Link>
    </Card>
  )
}

export default PhotoAlbum
