import { useState, useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import { Link, useLocation } from 'react-router-dom'

import i18n from './i18n.json'
import { AdminRoutes } from '@cardinalapps/ui/src/lib/net/router'

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
        className={activeItem === AdminRoutes.root ? 'active' : ''}
        key="overview"
      >
        <Link to={AdminRoutes.root}>
          <i className="fas fa-chart-area" />
          <span>{i18n['nav.overview']['en']}</span>
        </Link>
      </li>

      {/* Users */}
      <li
        className={activeItem === AdminRoutes.users ? 'active' : ''}
        key="users"
      >
        <Link to={AdminRoutes.users}>
          <i className="fas fa-user" />
          <span>{i18n['nav.users']['en']}</span>
        </Link>
      </li>

      {/* Roles */}
      <li
        className={activeItem === AdminRoutes.roles ? 'active' : ''}
        key="roles"
      >
        <Link to={AdminRoutes.roles}>
          <i className="fas fa-key" />
          <span>{i18n['nav.roles']['en']}</span>
        </Link>
      </li>

      {/* Indexing */}
      <li
        className={`${activeItem === AdminRoutes.indexing ? 'active' : ''}`}
        key="indexing"
      >
        <Link to={AdminRoutes.indexing}>
          <i className="fas fa-copy" />
          <span>{i18n['nav.indexing']['en']}</span>
        </Link>
      </li>

      {/* Jobs */}
      <li
        className={`${activeItem === AdminRoutes.jobs ? 'active' : ''}`}
        key="jobs"
      >
        <Link to={AdminRoutes.jobs}>
          <i className="fas fa-hard-hat" style={{}} />
          <span>{i18n['nav.jobs']['en']}</span>
        </Link>
      </li>

      {/* Libraries */}
      <li
        className={`${activeItem === AdminRoutes.libraries ? 'active' : ''}`}
        key="libraries"
      >
        <Link to={AdminRoutes.libraries}>
          <i className="fas fa-folder-open" style={{}} />
          <span>{i18n['nav.libraries']['en']}</span>
        </Link>
      </li>

      {children}
    </>
  )
}

export default Nav
