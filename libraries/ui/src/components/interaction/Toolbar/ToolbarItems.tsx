import { useState, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import Drawer from '../../layout/Drawer'

import Breadcrumbs, { BREADCRUMBS_SLUG } from './items/Breadcrumbs'
import Reset, { RESET_SLUG } from './items/Reset'
import VirtualLayout, { VIRTUAL_LAYOUT_SLUG } from './items/VirtualLayout'
import SimpleCount, { SIMPLE_COUNT_SLUG } from './items/SimpleCount'
import Selection, { SELECTION_SLUG } from './items/Selection'
import Order, { ORDER_SLUG } from './items/Order'
import OrderBy, { ORDER_BY_SLUG } from './items/OrderBy'
import DateRange, { DATE_RANGE_SLUG } from './items/DateRange'
import Delete, { DELETE_SLUG } from './items/Delete'
import Deselect, { DESELECT_SLUG } from './items/Deselect'
import Pagination, { PAGINATION_SLUG } from './items/Pagination'

import { layoutActions, layoutSelectors } from '../../../store/slices/layout'

import useWindowSize from '../../../hooks/useWindowSize'

import { ToolbarItemObject } from './types'

import './Toolbar.css'



type ToolbarItemsProps = {
  name?: string,
  items?: ToolbarItemObject[],
  numShowingItems?: number | string,
  numArchiveItems?: number,
  numItemsSelected?: number,
  itemNamePlural?: string,
  itemNameSingular?: string,
  defaultValues?: Record<string, unknown>,
  virtualViewName?: string,
  className?: string,
  style?: CSSProperties,
  collider?: string,
}

/**
 * Create a toolbar of controls.
 */
const ToolbarItems = ({
  name,
  items = [],
  numShowingItems,
  numItemsSelected,
  itemNamePlural,
  itemNameSingular,
  numArchiveItems,
  virtualViewName,
  defaultValues,
  collider,
}: ToolbarItemsProps) => {
  const dispatch = useDispatch()
  const windowSize = useWindowSize()
  const [mobileToolbarModalIsOpen, setMobileToolbarModalIsOpen] = useState(false)
  const { [virtualViewName]: virtualView } = useSelector(layoutSelectors.virtualViews)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const overflowRef = useRef<HTMLDivElement>(null)
  const overflowTriggerRef = useRef<HTMLDivElement>(null)
  const setOverflowRef = (el: HTMLDivElement | null) => {
    overflowRef.current = el
    if (!el) return
    const groups = Array.from(el.querySelectorAll<HTMLElement>(':scope > .toolbar-group'))
    const numVisible = groups.length - numHidden
    groups.forEach((g, i) => { g.style.display = i < numVisible ? 'none' : '' })
  }
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [numHidden, setNumHidden] = useState(0)

  useEffect(() => {
    if (!collider || !toolbarRef.current) return

    const measure = () => {
      const toolbar = toolbarRef.current?.parentElement
      const colliderEl = document.querySelector(collider)
      if (!toolbar || !colliderEl) return

      // Only direct children, excluding the overflow trigger itself
      const groups = Array.from(toolbarRef.current!.querySelectorAll<HTMLElement>(':scope > .toolbar-group:not(.toolbar-overflow-trigger)'))

      // Show all groups first so the toolbar reflects its full width
      groups.forEach((g) => (g.style.display = ''))

      let hidden = 0
      while (
        colliderEl.getBoundingClientRect().left - toolbar.getBoundingClientRect().right < 20 &&
        hidden < groups.length
      ) {
        groups[groups.length - 1 - hidden].style.display = 'none'
        hidden++
      }
      setNumHidden(hidden)
    }

    measure()

    const toolbarEl = toolbarRef.current?.parentElement
    const colliderEl = document.querySelector(collider)

    const resizeObserver = new ResizeObserver(measure)
    if (toolbarEl) resizeObserver.observe(toolbarEl)
    if (colliderEl) resizeObserver.observe(colliderEl)

    const mutationObserver = new MutationObserver(measure)
    if (toolbarEl) mutationObserver.observe(toolbarEl, { childList: true })

    window.addEventListener('resize', measure)

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [collider, windowSize])

  useEffect(() => {
    if (!overflowOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOverflowOpen(false)
    }
    const onMouseDown = (e: MouseEvent) => {
      if (!overflowTriggerRef.current?.contains(e.target as Node)) {
        setOverflowOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onMouseDown)
    }
  }, [overflowOpen])

  useEffect(() => {
    const overflow = overflowRef.current
    if (!overflow) return
    const groups = Array.from(overflow.querySelectorAll<HTMLElement>(':scope > .toolbar-group'))
    const numVisible = groups.length - numHidden
    groups.forEach((g, i) => {
      g.style.display = i < numVisible ? 'none' : ''
    })
  }, [numHidden, overflowOpen])

  /**
   * Return an instance of a built-in toolbar component.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getBuiltInItem = (item): React.ComponentType<any> => {
    switch (item) {
      case BREADCRUMBS_SLUG:
        return Breadcrumbs
      case RESET_SLUG:
        return Reset
      case VIRTUAL_LAYOUT_SLUG:
        return VirtualLayout
      case SIMPLE_COUNT_SLUG:
        return SimpleCount
      case SELECTION_SLUG:
        return Selection
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
                      numItemsSelected={numItemsSelected}
                      numShowingItems={numShowingItems}
                      itemNameSingular={itemNameSingular}
                      itemNamePlural={itemNamePlural}
                      defaultValues={defaultValues}
                      virtualViewName={virtualViewName}
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

  if (!windowSize?.width) {
    return null
  }

  return windowSize.width > 768
    ?
      // Desktop toolbar
      <div ref={toolbarRef} className="toolbar-collider">
        {ProvidedItemsGroup()}
        {collider && numHidden > 0 && (
          <div className="toolbar-group toolbar-overflow-trigger" ref={overflowTriggerRef}>
            <button className="overflow-button" onClick={() => setOverflowOpen((o) => !o)}>
              <i className="toolbar-icon fas fa-ellipsis-h" />
            </button>
            {overflowOpen && (
              <div className="toolbar-overflow-popout" ref={setOverflowRef}>
                {ProvidedItemsGroup()}
              </div>
            )}
          </div>
        )}
      </div>
    :
      // Mobile toolbar
      <>
        {MobileFilterGroup()}
        {!!mobileToolbarModalIsOpen &&
          <Drawer onClose={() => setMobileToolbarModalIsOpen(false)}>
            <div className="mobile-toolbar-drawer">
              {ProvidedItemsGroup()}
            </div>
          </Drawer>
        }
      </>
}

export default ToolbarItems
