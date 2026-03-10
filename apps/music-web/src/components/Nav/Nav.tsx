import { useState, useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import { Link, useLocation } from 'react-router-dom'

import * as routes from '../../routes'

import i18n from './i18n.json'

function Nav({ children }: PropsWithChildren) {
  const { pathname } = useLocation()
  const [activeItem, setActiveItem] = useState(window.location.pathname)

  useEffect(() => {
    setActiveItem(pathname)
  }, [pathname])

  return (
    <>
      {/* Listen Now */}
      <li
        className={activeItem === routes.ROOT ? 'active' : ''}
        key="listen-now"
      >
        <Link to={routes.ROOT}>
          <i className="fas fa-music" />
          <span>{i18n['nav.listen-now']['en']}</span>
        </Link>
      </li>

      {/* Artists */}
      <li
        className={`${activeItem === routes.ARTISTS ? 'active' : ''}`}
        key="artists"
      >
        <Link to={routes.ARTISTS}>
          <i className="fas fa-guitar" />
          <span>{i18n['nav.artists']['en']}</span>
        </Link>
      </li>

      {/* Releases */}
      <li
        className={`${activeItem === routes.RELEASES ? 'active' : ''}`}
        key="releases"
      >
        <Link to={routes.RELEASES}>
          <i className="fas fa-compact-disc" />
          <span>{i18n['nav.releases']['en']}</span>
        </Link>
      </li>

      {/* Tracks */}
      <li
        className={`${activeItem === routes.TRACKS ? 'active' : ''}`}
        key="tracks"
      >
        <Link to={routes.TRACKS}>
          <i className="fas fa-file-audio" />
          <span>{i18n['nav.tracks']['en']}</span>
        </Link>
      </li>

      {/* Playlists */}
      {/* <li
        className={`${activeItem === routes.PLAYLISTS ? 'active' : ''}`}
        key="playlists"
      >
        <Link to={routes.PLAYLISTS}>
          <i className="fas fa-stream" />
          <span>{i18n['nav.playlists']['en']}</span>
        </Link>
      </li> */}

      {/* History */}
      <li
        className={`${activeItem === routes.HISTORY ? 'active' : ''}`}
        key="history"
      >
        <Link to={routes.HISTORY}>
          <i className="fas fa-history" />
          <span>{i18n['nav.history']['en']}</span>
        </Link>
      </li>

      {children}
    </>
  )
}

export default Nav
