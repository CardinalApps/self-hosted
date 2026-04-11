import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import Drawer from '../../layout/Drawer'

import Order, { ORDER_SLUG } from './items/Order'
import OrderBy, { ORDER_BY_SLUG } from './items/OrderBy'
import DateRange, { DATE_RANGE_SLUG } from './items/DateRange'
import Delete, { DELETE_SLUG } from './items/Delete'
import Deselect, { DESELECT_SLUG } from './items/Deselect'
import Pagination, { PAGINATION_SLUG } from './items/Pagination'

import { settingsSelectors } from '../../../store/slices/settings'
import { layoutActions, layoutSelectors } from '../../../store/slices/layout'

import useWindowSize from '../../../hooks/useWindowSize'

import { formatWithCommas } from '../../../lib/formatting/number'
import { ToolbarItemObject } from './types'

import './Toolbar.css'

import i18n from './i18n'
import { motion } from 'framer-motion'
import clsx from 'clsx'


type ToolbarItemsProps = {
  name?: string,
  items?: ToolbarItemObject[],
  onClearSelection?: () => void,
  onDeleteSelection?: () => void,
  onReset?: () => void,
  numShowingItems?: number | string,
  numArchiveItems?: number,
  numItemsSelected?: number,
  itemNamePlural?: string,
  itemNameSingular?: string,
  defaultValues?: Record<string, unknown>,
  virtualViewName?: string,
  className?: string,
  style?: CSSProperties,
}

/**
 * Create a toolbar of controls.
 */
const ToolbarItems = ({
  name,
  items = [],
  onClearSelection = () => {},
  onDeleteSelection,
  onReset,
  numShowingItems,
  numItemsSelected,
  itemNamePlural,
  itemNameSingular,
  numArchiveItems,
  virtualViewName,
  defaultValues,
}: ToolbarItemsProps) => {
  const dispatch = useDispatch()
  const windowSize = useWindowSize()
  const pageTitle = useSelector(layoutSelectors.pageTitle)
  const { lang } = useSelector(settingsSelectors.current)
  const [mobileToolbarModalIsOpen, setMobileToolbarModalIsOpen] = useState(false)
  const { [virtualViewName]: virtualView } = useSelector(layoutSelectors.virtualViews)
  const [resetIconAnimation, setResetIconAnimation] = useState('')

  /**
   * Return an instance of a built-in toolbar component.
   */
  const getBuiltInItem = (item) => {
    switch (item) {
      case ORDER_SLUG:
        return Order
      case ORDER_BY_SLUG:
        return OrderBy
      case DATE_RANGE_SLUG:
        return DateRange
      case DELETE_SLUG:
        return Delete
      case DESELECT_SLUG:
        return Deselect
      case PAGINATION_SLUG:
        return Pagination
    }
  }

  /**
   * Group up toolbar items. We want an array of arrays, where each subarray is
   * a group.
   */
  const groupedItems = (): ToolbarItemObject[][] => {
    if (!items.length) {
      return [[]]
    }

    const allGroups = []
    const automaticGroup = []

    items.forEach((item) => {
      // An item without a group goes into the automatic group
      if (typeof items[0] === 'object' && !Array.isArray(items[0]) && items[0] !== null) {
        automaticGroup.push(item)
      }
      // Each array is a group
      else if (Array.isArray(item)) {
        allGroups.push(item)
      } else {
        console.warn('Invalid toolbar item was supplied:', item)
      }
    })

    if (automaticGroup.length) {
      allGroups.unshift(automaticGroup)
    }

    return allGroups
  }

  /**
   * All toolbar items use this for updating their values.
   */
  const onItemValueChange = (slug, newVal, toolbarValues) => {
    dispatch(layoutActions.setToolbarValues({
      name,
      values: {
        ...defaultValues,
        ...toolbarValues,
        [slug]: newVal,
      },
    }))
  }

  /**
   * Return the automatically-pluraized noun of what this toolbar is controlling
   * (e.g., photos, albums, etc).
   */
  const itemName = function() {
    const total = virtualViewName ? virtualView?.total : numArchiveItems
    return total === 1
      ? itemNameSingular ? itemNameSingular : i18n['item.singular.default'][lang]
      : itemNamePlural ? itemNamePlural : i18n['item.plural.default'][lang]
  }

  /**
   * Displays the current page name.
   */
  const BreadcrumbsGroup = function() {
    if (!pageTitle) {
      return null
    }
    return (
      <>
        <div className="toolbar-group">
          <h2 className="toolbar-page-title">{pageTitle}</h2>
        </div>
      </>
    )
  }

  /**
   * Displays a simple count of how many items are in the archive. Requires
   * `numArchiveItems`.
   */
  const SimpleCountGroup = function() {
    if (!numArchiveItems) {
      return null
    }
    const total = virtualViewName ? virtualView?.total : numArchiveItems
    return (
      <>
        {!!total && !numItemsSelected && !numShowingItems &&
          <div className="toolbar-group">
            <p className="toolbar-total-items toolbar-text">
              {i18n['total-items'][lang]
                .replace('{total}', formatWithCommas(total))
                .replace('{item}', itemName())
              }
            </p>
          </div>
        }
      </>
    )
  }

  /**
   * Shows the current virtualized range when this toolbar is connected to a
   * virtual layout.
   */
  const VirtualLayoutGroup = function() {
    return (
      !!virtualView?.start && !!virtualView?.end && !!virtualView?.total &&
        <div className="toolbar-group">
          <p className="toolbar-total-items toolbar-text">
            {i18n['paginated-items'][lang]
              .replace('{paginated}', `${formatWithCommas(virtualView.start)}-${formatWithCommas(virtualView.end)}`)
              .replace('{total}', formatWithCommas(virtualView.total))
              .replace('{item}', itemName())
            }
          </p>
        </div>
    )
  }

  /**
   * Shows the current selection of items.
   */
  const SelectionGroup = function() {
    const total = virtualViewName ? virtualView?.total : numArchiveItems
    return (
      /* Controls for the selected items */
      !!total && !!numItemsSelected &&
        <div className="toolbar-group">
          <p className="toolbar-total-items toolbar-text">
            {i18n['selected-items'][lang]
              .replace('{selected}', formatWithCommas(numItemsSelected))
              .replace('{total}', formatWithCommas(total))
              .replace('{item}', itemName())
            }
          </p>
          {/* Controls for the current selection */}
          {!!total && !!numItemsSelected &&
            <>
              <div className="toolbar-item">
                <Deselect onClick={onClearSelection} />
              </div>
              {!!onDeleteSelection &&
                <div className="toolbar-item">
                  <Delete onClick={onDeleteSelection} />
                </div>
              }
            </>
          }
        </div>
    )
  }

  /**
   * Render all of the items provided by the Toolbar `items` prop.
   */
  const ProvidedItemsGroup = function() {
    const total = virtualViewName ? virtualView?.total : numArchiveItems
    return (
      !!items.length && groupedItems().map((group, i) => {
        return (
          <div className="toolbar-group" key={i}>
            {group.map((item, i) => {
              // Render built-in toolbar items
              if (typeof item?.render === 'string') {
                const Component = getBuiltInItem(item.render)
                return !!Component && (
                  <div className="toolbar-item built-in-item" data-item={item.render} key={item?.title || i}>
                    <Component
                      toolbarName={name}
                      item={item}
                      onChange={onItemValueChange}
                      numArchiveItems={total}
                    />
                  </div>
                )
              }
              // Render custom toolbar items
              else if (typeof item?.render === 'function') {
                return (
                  <div className="toolbar-item custom-item" data-item={item.slug} key={item?.title || i}>
                    {item?.render({
                      toolbarName: name,
                      onChange: onItemValueChange,
                    })}
                  </div>
                )
              }
            })}
          </div>
        )
      })
    )
  }

  /**
   * A mobile-only button for opening the modal with the controls.
   */
  const MobileFilterGroup = function() {
    return (
      <div className="toolbar-group">
        <div className="toolbar-item">
          <button
            className="toolbar-button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMobileToolbarModalIsOpen(true)
            }}
          >
            <i className="toolbar-icon fas fa-filter" />
          </button>
        </div>
      </div>
    )
  }

  const reset = () => {
    dispatch(layoutActions.setToolbarValues({
      name,
      values: defaultValues,
    }))
    onReset?.()
    setResetIconAnimation('spin')
    if (virtualViewName) {
      dispatch(layoutActions.resetScrollPoint(virtualViewName))
    }
  }

  const ResetGroup = () => {
    if (!items.length) {
      return null
    }
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

  if (!windowSize?.width) {
    return null
  }

  return windowSize.width > 768
    ?
      // Desktop toolbar
      <>
        <BreadcrumbsGroup />
        <SimpleCountGroup />
        <VirtualLayoutGroup />
        <SelectionGroup />
        <ProvidedItemsGroup />
        <ResetGroup />
      </>
    :
      // Mobile toolbar
      <>
        <MobileFilterGroup />
        {!!mobileToolbarModalIsOpen &&
          <Drawer onClose={() => setMobileToolbarModalIsOpen(false)}>
            <div className="mobile-toolbar-drawer">
              <BreadcrumbsGroup />
              <SimpleCountGroup />
              <VirtualLayoutGroup />
              <SelectionGroup />
              <ProvidedItemsGroup />
              <ResetGroup />
            </div>
          </Drawer>
        }
      </>
}

export default ToolbarItems
