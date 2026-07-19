import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useDispatch } from 'react-redux'
import clsx from 'clsx'

import { ORDER_SLUG, DEFAULT_ORDER } from './items/Order'
import { ORDER_BY_SLUG, DEFAULT_ORDER_BY } from './items/OrderBy'
import { DATE_RANGE_SLUG, DEFAULT_DATE_RANGE } from './items/DateRange'
import { PAGINATION_SLUG, DEFAULT_PAGINATION } from './items/Pagination'

import ToolbarItems from './ToolbarItems'
import { ToolbarItems as ToolbarItemsType } from './types'

import { layoutActions } from '../../../store/slices/layout'

import './Toolbar.css'

const DEFAULT_VALUES = {
  [ORDER_SLUG]: DEFAULT_ORDER,
  [ORDER_BY_SLUG]: DEFAULT_ORDER_BY,
  [DATE_RANGE_SLUG]: DEFAULT_DATE_RANGE,
  [PAGINATION_SLUG]: DEFAULT_PAGINATION,
}

type ToolbarProps = {
  name?: string,
  items?: ToolbarItemsType,
  numShowingItems?: number | string,
  numArchiveItems?: number,
  numItemsSelected?: number,
  itemNamePlural?: string,
  itemNameSingular?: string,
  virtualViewName?: string,
  /*
    A slim toolbar holds a single, wholly clickable button per group: full-height buttons,
    no group padding, and no collapse into the mobile drawer. Meant for Cycle/Icon-style
    items; don't mix slim and regular items in one toolbar.
  */
  slim?: boolean,
  className?: string,
  style?: CSSProperties,
  collider?: string,
}

/**
 * Create a toolbar of controls. Toolbars can be linked to a virtual page layout
 * by passing a `virtualViewName`. If not using a virtual layout, you must pass
 * `numArchiveItems` for most things to work.
 */
const Toolbar = ({
  name,
  items = [],
  numShowingItems,
  numArchiveItems,
  numItemsSelected,
  itemNamePlural,
  itemNameSingular,
  virtualViewName,
  slim = false,
  className,
  style,
  collider = '.menu-col',
}: ToolbarProps) => {
  const dispatch = useDispatch()

  /**
   * Merge the hardcoded DEFAULT_VALUES with the initial values supplied in the
   * props.
   */
  const getDefaultValues = () => {
    const defaultInitialValues = {}

    items.flat().forEach((item) => {
      const value = item?.initialValue || DEFAULT_VALUES[item?.slug]
      if (value?.start instanceof Date) {
        value.start = value.start.toString()
      }
      if (value?.end instanceof Date) {
        value.end = value.end.toString()
      }
      defaultInitialValues[item?.slug] = value
    })

    return defaultInitialValues
  }

  /**
   * Save toolbar values in store on init if they haven't been set yet.
   */
  useEffect(() => {
    dispatch(layoutActions.initToolbarValues({
      name,
      values: getDefaultValues(),
    }))
  }, [])

  return (
    <>
      <div className={clsx('toolbar', 'toolbar-uid-' + name, slim && 'slim', className)} style={style}>
        <ToolbarItems
          name={name}
          items={items}
          slim={slim}
          numShowingItems={numShowingItems}
          numArchiveItems={numArchiveItems}
          numItemsSelected={numItemsSelected}
          itemNamePlural={itemNamePlural}
          itemNameSingular={itemNameSingular}
          virtualViewName={virtualViewName}
          defaultValues={getDefaultValues()}
          collider={collider}
        />
      </div>
    </>
  )
}

export default Toolbar
