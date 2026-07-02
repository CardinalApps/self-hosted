import { useState, useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import { Link, useLocation } from 'react-router-dom'

import i18n from './i18n.json'
import { AdminRoutes } from '@cardinalapps/ui/src/lib/net/router'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'

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
          <Icon fa="fas fa-chart-area" />
          <span>{i18n['nav.overview']['en']}</span>
        </Link>
      </li>

      {/* Users */}
      <li
        className={activeItem === AdminRoutes.users ? 'active' : ''}
        key="users"
      >
        <Link to={AdminRoutes.users}>
          <Icon fa="fas fa-user" />
          <span>{i18n['nav.users']['en']}</span>
        </Link>
      </li>

      {/* Roles */}
      <li
        className={activeItem === AdminRoutes.roles ? 'active' : ''}
        key="roles"
      >
        <Link to={AdminRoutes.roles}>
          <Icon fa="fas fa-key" />
          <span>{i18n['nav.roles']['en']}</span>
        </Link>
      </li>

      {/* Indexing */}
      <li
        className={`${activeItem === AdminRoutes.indexing ? 'active' : ''}`}
        key="indexing"
      >
        <Link to={AdminRoutes.indexing}>
          <Icon fa="fas fa-copy" />
          <span>{i18n['nav.indexing']['en']}</span>
        </Link>
      </li>

      {/* Jobs */}
      <li
        className={`${activeItem === AdminRoutes.jobs ? 'active' : ''}`}
        key="jobs"
      >
        <Link to={AdminRoutes.jobs}>
          <Icon fa="fas fa-hard-hat" style={{}} />
          <span>{i18n['nav.jobs']['en']}</span>
        </Link>
      </li>

      {/* Libraries */}
      <li
        className={`${activeItem === AdminRoutes.libraries ? 'active' : ''}`}
        key="libraries"
      >
        <Link to={AdminRoutes.libraries}>
          <Icon fa="fas fa-folder-open" style={{}} />
          <span>{i18n['nav.libraries']['en']}</span>
        </Link>
      </li>

      {children}
    </>
  )
}

export default Nav
