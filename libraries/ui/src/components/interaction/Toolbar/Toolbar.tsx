import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import clsx from 'clsx'
import { motion } from 'framer-motion'

import { ORDER_SLUG, DEFAULT_ORDER } from './items/Order'
import { SORT_SLUG, DEFAULT_SORT } from './items/Sort'
import { DATE_RANGE_SLUG, DEFAULT_DATE_RANGE } from './items/DateRange'
import { PAGINATION_SLUG, DEFAULT_PAGINATION } from './items/Pagination'

import ToolbarItems from './ToolbarItems'

import { settingsSelectors } from '../../../store/slices/settings'
import { layoutActions } from '../../../store/slices/layout'

import './Toolbar.css'

import i18n from './i18n'

import { ToolbarItemObject } from './types'

const DEFAULT_VALUES = {
  [ORDER_SLUG]: DEFAULT_ORDER,
  [SORT_SLUG]: DEFAULT_SORT,
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
  const { lang } = useSelector(settingsSelectors.current)
  const [resetIconAnimation, setResetIconAnimation] = useState('')

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

  const reset = () => {
    dispatch(layoutActions.setToolbarValues({
      name,
      values: getDefaultValues(),
    }))
    onReset?.()
    setResetIconAnimation('spin')
    if (virtualViewName) {
      dispatch(layoutActions.resetScrollPoint(virtualViewName))
    }
  }

  const ResetGroup = () => {
    return (
      <div className="toolbar-group">
        <motion.div
          className={clsx('toolbar-item', 'reset')}
          initial={{
            transform: 'rotate(0deg)',
          }}
          animate={{
            transform: resetIconAnimation ? 'rotate(-360deg)' : 'rotate(0deg)',
            transition: { type: 'spring', duration: 0.5 },
          }}
          onClick={() => {
            if (resetIconAnimation) {
              setResetIconAnimation('')
            }
          }}
          onAnimationComplete={() => setResetIconAnimation?.('')}
        >
          <button className="toolbar-button" onClick={reset} title={i18n['reset.title'][lang]}>
            <i className="toolbar-icon fas fa-undo-alt" />
          </button>
        </motion.div>
      </div>
    )
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
          numShowingItems={numShowingItems}
          numArchiveItems={numArchiveItems}
          numItemsSelected={numItemsSelected}
          itemNamePlural={itemNamePlural}
          itemNameSingular={itemNameSingular}
          virtualViewName={virtualViewName}
          defaultValues={getDefaultValues()}
        />
        <ResetGroup />
      </div>
    </>
  )
}

export default Toolbar
