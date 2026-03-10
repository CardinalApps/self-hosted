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
      {/* Overview */}
      <li
        className={activeItem === routes.ROOT ? 'active' : ''}
        key="overview"
      >
        <Link to={routes.ROOT}>
          <i className="fas fa-images" />
          <span>{i18n['nav.archive']['en']}</span>
        </Link>
      </li>

      {/* Albums */}
      <li
        className={`${activeItem === routes.PHOTO_ALBUMS || activeItem === routes.PHOTO_ALBUM ? 'active' : ''}`}
        key="albums"
      >
        <Link to={routes.PHOTO_ALBUMS}>
          <i className="fas fa-book" />
          <span>{i18n['nav.albums']['en']}</span>
        </Link>
      </li>

      {/* People */}
      <li
        className={`${activeItem === routes.PEOPLE ? 'active' : ''}`}
        key="people"
      >
        <Link to={routes.PEOPLE}>
          <i className="fas fa-users" />
          <span>{i18n['nav.people']['en']}</span>
        </Link>
      </li>

      {/* Locations */}
      <li
        className={`${activeItem === routes.LOCATIONS ? 'active' : ''}`}
        key="locations"
      >
        <Link to={routes.LOCATIONS}>
          <i className="fas fa-map-marked-alt" />
          <span>{i18n['nav.locations']['en']}</span>
        </Link>
      </li>

      {children}
    </>
  )
}

export default Nav
