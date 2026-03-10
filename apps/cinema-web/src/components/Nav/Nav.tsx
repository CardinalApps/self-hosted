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
      {/* Watch Now */}
      <li
        className={activeItem === routes.ROOT ? 'active' : ''}
        key="watch-now"
      >
        <Link to={routes.ROOT}>
          <i className="fas fa-film" />
          <span>{i18n['nav.watch-now']['en']}</span>
        </Link>
      </li>

      {/* Movies */}
      <li
        className={`${activeItem === routes.MOVIES ? 'active' : ''}`}
        key="movies"
      >
        <Link to={routes.MOVIES}>
          <i className="fas fa-video" />
          <span>{i18n['nav.movies']['en']}</span>
        </Link>
      </li>

      {/* TV */}
      <li
        className={`${activeItem === routes.TV ? 'active' : ''}`}
        key="tv"
      >
        <Link to={routes.TV}>
          <i className="fas fa-tv" />
          <span>{i18n['nav.tv']['en']}</span>
        </Link>
      </li>

      {/* Channels */}
      <li
        className={`${activeItem === routes.CHANNELS ? 'active' : ''}`}
        key="channels"
      >
        <Link to={routes.CHANNELS}>
          <i className="fas fa-couch" />
          <span>{i18n['nav.channels']['en']}</span>
        </Link>
      </li>

      {/* Libraries */}
      <li
        className={`${activeItem === routes.LIBRARIES ? 'active' : ''}`}
        key="libraries"
      >
        <Link to={routes.LIBRARIES}>
          <i className="fas fa-boxes" />
          <span>{i18n['nav.libraries']['en']}</span>
        </Link>
      </li>

      {/* Playlists */}
      <li
        className={`${activeItem === routes.PLAYLISTS ? 'active' : ''}`}
        key="playlists"
      >
        <Link to={routes.PLAYLISTS}>
          <i className="fas fa-stream" />
          <span>{i18n['nav.playlists']['en']}</span>
        </Link>
      </li>

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
