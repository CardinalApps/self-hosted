import { useContext } from 'react'
import { useSelector } from 'react-redux'

import { RouterContext } from '../../../../../context/router'
import { layoutSelectors } from '../../../../../store/slices/layout'
import { ToolbarItem, ToolbarItemProps, BreadcrumbsExtra } from '../../types'

export const SLUG = ToolbarItem.BREADCRUMBS

const ToolbarBreadcrumbs = ({ item }: ToolbarItemProps) => {
  const { Link } = useContext(RouterContext)
  const pageTitle = useSelector(layoutSelectors.pageTitle)
  const { rootLink, crumbs } = (item?.extra ?? {}) as BreadcrumbsExtra

  return (
    <div className="toolbar-breadcrumbs">
      <h2 className="toolbar-page-title">
        {rootLink
          ? <Link to={rootLink} className="toolbar-breadcrumb">{pageTitle}</Link>
          : pageTitle
        }
      </h2>
      {crumbs?.map((crumb, i) => (
        <span key={i} className="toolbar-breadcrumb-item">
          <span className="toolbar-breadcrumb-separator">/</span>
          {crumb.to
            ? <Link to={crumb.to} className="toolbar-breadcrumb">{crumb.label}</Link>
            : <span className="toolbar-breadcrumb">{crumb.label}</span>
          }
        </span>
      ))}
    </div>
  )
}

export default ToolbarBreadcrumbs
