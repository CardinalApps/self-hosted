import { useContext, type PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import { RouterContext } from '../../../context/router'
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

  const optionalLink = (children) => {
    if (link && Link) {
      return <Link className="artist-link" to={link}>{children}</Link>
    } else {
      return children
    }
  }

  return (
    <div className={clsx(`music-artist`)}>
      {optionalLink(
        <>
          <header>
            <p className="artist-name">{name}</p>
          </header>
          {!!image && <div className="artist-image" style={{ backgroundImage: `url('${image}')`  }} />}
          {(!!numReleases || !!numTracks) && (
            <footer>
              {!!numReleases && numReleases === 1 && <span className="artist-stat">{i18n['artist.num-releases.singular'][lang].replace('{num}', numReleases)}</span>}
              {!!numReleases && numReleases !== 1 && <span className="artist-stat">{i18n['artist.num-releases.plural'][lang].replace('{num}', numReleases)}</span>}

              {!!numTracks && numTracks === 1 && <span className="artist-stat">{i18n['artist.num-tracks.singular'][lang].replace('{num}', numTracks)}</span>}
              {!!numTracks && numTracks !== 1 && <span className="artist-stat">{i18n['artist.num-tracks.plural'][lang].replace('{num}', numTracks)}</span>}
            </footer>
          )}
        </>,
      )}
    </div>
  )
}

export default MusicArtist
