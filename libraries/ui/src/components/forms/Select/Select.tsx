import { useState, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import clsx from 'clsx'

import useClickOutside from '../../../hooks/useClickOutside'

import { settingsSelectors } from '../../../store/slices/settings'

import i18n from './i18n'

import './Select.css'

type SelectProps = {
  name?: string,
  label?: string,
  labelIcon?: string,
  selectPlaceholder?: string,
  searchPlaceholder?: string,
  selectedPrefix?: string,
  value?: string | string[],
  options?: Record<string, unknown> | Record<string, unknown>[],
  typingAreaStyles?: CSSProperties,
  upperStyles?: CSSProperties,
  multi?: boolean,
  min?: number,
  max?: number,
  size?: 'l' | 'm' | 's',
  layout?: 'underline',
  onChange?: (selected) => void,
  style?: CSSProperties,
  className?: string,
}

/**
 * Helper for converting the given options to a standard internal format.
 */
const optionsAsArray = (options) => {
  if (Array.isArray(options)) {
    return options
  } else if (typeof options === 'object' && !!options) {
    return Object.keys(options).map((option) => ({
      label: options[option],
      value: option,
    }))
  } else {
    console.error('Invalid options format for <Select />')
    return []
  }
}

/**
 * Helper for converting the given value to a standard internal format.
 */
const anyToSelected = (any) => {
  let standard

  if (typeof any === 'undefined') {
    return any
  }

  if (typeof any === 'string') {
    standard = [any]
  } else if (Array.isArray(any)) {
    standard = any
  }

  return standard
}

/**
 * Check if two states are different.
 */
const selectedStatesAreDifferent = (state1, state2) => {
  return anyToSelected(state1)?.join(',') !== anyToSelected(state2)?.join(',')
}

/**
 * Dropdown.
 *
 * @param {Array} options - An array of objects with keys `label` and `value`.
 */
const Select = ({
  name,
  label,
  labelIcon,
  selectPlaceholder,
  searchPlaceholder,
  selectedPrefix = '',
  value,
  options = [],
  typingAreaStyles,
  upperStyles,
  multi = true,
  min,
  max,
  size = "l",
  layout,
  onChange = () => {},
  style,
  className,
}: SelectProps) => {
  const ref = useRef(null)
  const searchRef = useRef(null)
  const { clickedOutside, resetClickOutside } = useClickOutside(ref)
  const { lang } = useSelector(settingsSelectors.current)
  const [selected, setSelected] = useState(value ? anyToSelected(value) : undefined)
  const [popoutOpen, setPopoutOpen] = useState(false)
  const [canSearch, setCanSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  /**
   * Update, but only if there is a change.
   */
  const updateOnlyIfDiff = (newSelected) => {
    const standard = anyToSelected(newSelected)

    if (newSelected?.length) {
      if (selected?.length) {
        // Only overwrite current selected array (thereby triggering a
        // re-render) if the new array values are different
        if (selectedStatesAreDifferent(standard, selected)) {
          setSelected(standard)
        }
      } else {
        setSelected(standard)
      }
    } else {
      setSelected(undefined)
    }
  }

  /**
   * When an item in the custom dropdown has been clicked.
   */
  const onCustomOptionsClick = (item, isSelected) => {
    if (isSelected) {
      if (min && selected?.length === min) {
        return
      }
      const newSelected = [...selected]
      newSelected.splice(selected.indexOf(item.value), 1)
      updateOnlyIfDiff(newSelected)
    } else {
      if (multi) {
        if (max && selected?.length === max) {
          return
        }
        if (selected?.length) {
          updateOnlyIfDiff([...selected, item.value])
        } else {
          updateOnlyIfDiff([item.value])
        }
      } else {
        updateOnlyIfDiff([item.value])
        setPopoutOpen(false)
      }
    }
  }

  /**
   * Create the main string to show.
   */
  const inputLabel = () => {
    // User has selected something
    if (Array.isArray(selected) && selected.length) {
      // Only 1 is selected
      if (selected.length === 1) {
        const firstSelected = optionsAsArray(options).find((opt) => opt.value === selected[0])
        if (firstSelected) {
          return `${selectedPrefix}${firstSelected?.sentenceCase || firstSelected?.label}`
        } else {
          return `${selectedPrefix}`
        }
      }
      // Multiple are selected
      else {
        const sortShortestLabel = [...selected].map((value) => optionsAsArray(options).find((opt) => opt.value === value))
        sortShortestLabel.sort((a, b) => a.label.length - b.label.length)
        const shortestLabel = sortShortestLabel[0]?.sentenceCase || sortShortestLabel[0]?.label
        return `${selectedPrefix}${i18n['custom-select.multiple-selected'][lang]
          .replace('{first}', shortestLabel)
          .replace('{num}', selected.length - 1)}`
      }
    }
    // Nothing has been selected
    else {
      return selectPlaceholder ? selectPlaceholder : i18n['custom-select.nothing-selected'][lang]
    }
  }

  /**
   * Keyup event for options.
   */
  const onOptionKeyUp = (e) => {
    if (e.code === 'ArrowUp') {
      const prevEl = e.target.previousSibling
      if (prevEl) {
        prevEl.focus()
      } else {
        searchRef.current.focus()
      }
    } else if (e.code === 'ArrowDown') {
      e.target.nextSibling?.focus()
    }
  }

  /**
   * Blur event for options.
   */
  const onSelectBlur = (e) => {
    const isOutside = !e.relatedTarget?.closest(`.custom-select[data-name=${name}]`)

    if (isOutside && !e?.relatedTarget?.closest(`.custom-select[data-name=${name}]`)) {
      setPopoutOpen(false)
    }
  }

  /**
   * Determine what to show in the options list.
   */
  const filteredOptions = (options) => {
    const filtered = optionsAsArray(options)
      .map((item) => {
        const isSelected = Array.isArray(selected) && selected.includes(item.value)
        const allowedBySearchQuery = searchQuery
          ? !!item.label.toLowerCase().includes(searchQuery.toLowerCase())
          : true

        return allowedBySearchQuery
          ? <button
              type="button"
              className={clsx('option', isSelected && 'selected')}
              key={item?.value}
              value={item?.value}
              onClick={() => onCustomOptionsClick(item, isSelected)}
              onKeyUp={onOptionKeyUp}
            >
              {item?.label}
              {!!isSelected && <i className="fas fa-check-circle" />}
            </button>
          :
          undefined
      })
      .filter((item) => !!item)

    if (filtered.length) {
      return filtered
    } else {
      return [<div className="no-options" key="no-options">{i18n['custom-select.no-options'][lang]}</div>]
    }
  }

  /**
   * Focuses the first item in the options list.
   */
  const focusFirstOptionItem = () => {
    setPopoutOpen(true)
    setTimeout(() => {
      ref.current?.querySelectorAll('.options .option')[0]?.focus()
    }, 0)
  }

  /**
   * Close the options list when clicked outside.
   */
  useEffect(() => {
    if (clickedOutside) {
      setPopoutOpen(false)
      resetClickOutside()
    }
  }, [clickedOutside])

  /**
   * Switch between the selected items and the search bar when the options list
   * is open.
   */
  useEffect(() => {
    if (popoutOpen) {
      setCanSearch(true)
      setTimeout(() => {
        searchRef.current?.focus()
      }, 0)
    } else {
      setCanSearch(false)
    }
  }, [popoutOpen])

  /**
   * Propagate changes.
   */
  useEffect(() => {
    if (selectedStatesAreDifferent(selected, value)) {
      if (multi) {
        onChange?.(selected)
      } else {
        onChange?.(selected?.[0])
      }
    }
  }, [selected])

  useEffect(() => {
    if (value) {
      updateOnlyIfDiff(value)
    }
  }, [value])

  return (
    <>
      <div
        className={clsx(
          'custom-select',
          `size-${size}`,
          'select',
          layout && 'layout-underline',
          className,
        )}
        style={style}
        ref={ref}
        onBlur={onSelectBlur}
        data-name={name}
      >
        {!!label && <p className="custom-select-label">{label}</p>}
        <div className={clsx('typing-area')} style={typingAreaStyles}>
          {!canSearch && (
            <>
              <div
                tabIndex={0}
                className="selected upper"
                onClick={() => setPopoutOpen(true)}
                onFocus={() => setPopoutOpen(true)}
                style={upperStyles}
              >
                <span>{labelIcon ? <i className={clsx(labelIcon, 'label-icon')} /> : null}{inputLabel()}</span>
              </div>
              <i className="icon down-icon fas fa-angle-down" />
            </>
          )}
          {!!canSearch &&
            <>
              <input
                ref={searchRef}
                className="upper"
                name="_select-search-query"
                type="text"
                placeholder={searchPlaceholder ? searchPlaceholder : i18n['custom-select.search'][lang]}
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target?.value ? e.target.value : '')}
                onFocus={() => setPopoutOpen(true)}
                onKeyUp={(e) => e.code === 'ArrowDown' ? focusFirstOptionItem() : undefined}
              />
              {!searchQuery && <i className="icon search-icon fas fa-search" />}
              {!!searchQuery &&
                <button
                  className="icon-button"
                  onClick={() => {
                    setSearchQuery('')
                    setTimeout(() => {
                      searchRef.current?.focus()
                    }, 0)
                  }}
                >
                  <i className="icon erase-icon fas fa-eraser" />
                </button>
              }
            </>
          }
          {!!multi && !!popoutOpen && !!selected?.length && !searchQuery &&
            <div className="num-selected">{selected.length}</div>
          }
        </div>
        {!!popoutOpen && (
          <motion.div
            className="options"
            initial={{ translateY: -6, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
          >
            {filteredOptions(options)}
          </motion.div>
        )}
        <input type="hidden" name={name} value={selected || ''} />
      </div>
    </>
  )
}

export default Select
