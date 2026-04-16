import { useContext, useState, type PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import { RouterContext } from '../../../context/router'
import { useAppSelector } from '../../../hooks/useAppSelector'
import { appSelectors } from '../../../store/slices/app'

import { settingsSelectors } from '../../../store/slices/settings'

import i18n from './i18n'

import './MusicArtist.css'

type MusicArtistProps = {
  name?: string,
  image?: string,
  link?: string,
  numReleases?: number,
  numTracks?: number,
}

const MusicArtist = ({
  name,
  link,
  image,
  numReleases,
  numTracks,
}: PropsWithChildren<MusicArtistProps>) => {
  const { Link } = useContext(RouterContext)
  const { lang } = useSelector(settingsSelectors.current)
  const kioskMode = useAppSelector(appSelectors.kioskMode)
  const [randomKioskNumber] = useState(Math.floor(Math.random() * 100) + 1)

  const getArtistImage = () => {
    if (kioskMode) {
      return `https://cardinalpublicstorage.blob.core.windows.net/demo-images/pregenerated/artists/${randomKioskNumber}.jpg`
    }
    return image
  }

  const optionalLink = (children) => {
    if (link && Link) {
      return <Link className="artist-link artist-layout" to={link}>{children}</Link>
    } else {
      return <div className="artist-layout">{children}</div>
    }
  }

  return (
    <div className={clsx(`music-artist`, getArtistImage() && 'has-image')}>
      {optionalLink(
        <>
          {!!getArtistImage() && <div className="artist-image" style={{ backgroundImage: `url('${getArtistImage()}')`  }} />}
          <p className="artist-name">{name}</p>
          {(!!numReleases || !!numTracks) && (
            <div className="artist-meta">
              {!!numReleases && numReleases === 1 && <span className="artist-stat">{i18n['artist.num-releases.singular'][lang].replace('{num}', numReleases)}</span>}
              {!!numReleases && numReleases !== 1 && <span className="artist-stat">{i18n['artist.num-releases.plural'][lang].replace('{num}', numReleases)}</span>}

              {!!numTracks && numTracks === 1 && <span className="artist-stat">{i18n['artist.num-tracks.singular'][lang].replace('{num}', numTracks)}</span>}
              {!!numTracks && numTracks !== 1 && <span className="artist-stat">{i18n['artist.num-tracks.plural'][lang].replace('{num}', numTracks)}</span>}
            </div>
          )}
        </>,
      )}
    </div>
  )
}

export default MusicArtist
