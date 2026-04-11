import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useDispatch } from 'react-redux'
import clsx from 'clsx'

import { ORDER_SLUG, DEFAULT_ORDER } from './items/Order'
import { ORDER_BY_SLUG, DEFAULT_ORDER_BY } from './items/OrderBy'
import { DATE_RANGE_SLUG, DEFAULT_DATE_RANGE } from './items/DateRange'
import { PAGINATION_SLUG, DEFAULT_PAGINATION } from './items/Pagination'

import ToolbarItems from './ToolbarItems'
import { ToolbarItemObject } from './types'

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
  items?: ToolbarItemObject[],
  onReset?: () => void,
  onClearSelection?: () => void,
  onDeleteSelection?: () => void,
  numShowingItems?: number | string,
  numArchiveItems?: number,
  numItemsSelected?: number,
  itemNamePlural?: string,
  itemNameSingular?: string,
  virtualViewName?: string,
  className?: string,
  style?: CSSProperties,
}

/**
 * Create a toolbar of controls. Toolbars can be linked to a virtual page layout
 * by passing a `virtualViewName`. If not using a virtual layout, you must pass
 * `numArchiveItems` for most things to work.
 */
const Toolbar = ({
  name,
  items = [],
  onReset = () => {},
  onClearSelection = () => {},
  onDeleteSelection,
  numShowingItems,
  numArchiveItems,
  numItemsSelected,
  itemNamePlural,
  itemNameSingular,
  virtualViewName,
  className,
  style,
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
      <div className={clsx('toolbar', className)} style={style}>
        <ToolbarItems
          name={name}
          items={items}
          onClearSelection={onClearSelection}
          onDeleteSelection={onDeleteSelection}
          onReset={onReset}
          numShowingItems={numShowingItems}
          numArchiveItems={numArchiveItems}
          numItemsSelected={numItemsSelected}
          itemNamePlural={itemNamePlural}
          itemNameSingular={itemNameSingular}
          virtualViewName={virtualViewName}
          defaultValues={getDefaultValues()}
        />
      </div>
    </>
  )
}

export default Toolbar
