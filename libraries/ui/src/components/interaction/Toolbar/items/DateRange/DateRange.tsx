import { useState } from 'react'
import { useSelector } from 'react-redux'
import dateRangeInWords from 'date-fns/formatDistanceStrict'
import ms from 'ms'

import H6 from '../../../../typography/H6'

import ItemPopout from '../../ItemPopout'
import { ToolbarItemProps, ToolbarItem } from '../../types'

import { settingsSelectors } from '../../../../../store/slices/settings'
import { layoutSelectors } from '../../../../../store/slices/layout'

import i18n from './i18n'

import './DateRange.css'


export const SLUG = ToolbarItem.DATERANGE

export type DateRangeValue = {
  start: Date,
  end: Date,
}

export const DEFAULT_VALUE: DateRangeValue = {
  start: new Date(Date.now() - ms('7 days')),
  end: new Date(),
}

/**
 * This toolbar item is used for selecting a start and end date.
 */
const DateRange = ({
  toolbarName,
  onChange = () => {},
}: ToolbarItemProps) => {
  const { lang } = useSelector(settingsSelectors.current)
  const [popoutIsOpen, setPopoutIsOpen] = useState(false)
  const { [toolbarName]: toolbarValues } = useSelector(layoutSelectors.toolbarValues)
  const daterange = toolbarValues.daterange as DateRangeValue
  const startDate = daterange?.start ? new Date(daterange.start) : DEFAULT_VALUE.start
  const endDate = daterange?.end ? new Date(daterange.end) : DEFAULT_VALUE.end

  const onIconClick = () => {
    setPopoutIsOpen(true)
  }

  /**
   * Write the range in words.
   */
  const rangeInWords = () => {
    let str = dateRangeInWords(
      typeof startDate === 'string' ? new Date(startDate) : startDate,
      typeof endDate === 'string' ? new Date(endDate) : endDate,
      { roundingMethod: 'ceil' },
    )
    if (str[str.length - 1] === 's') {
      str = str.substring(0, str.length - 1)
    }
    return str
  }

  /**
   * Convert the date to yyyy-mm-dd.
   */
  const formatInputValue = (value) => {
    const d = new Date(value)
    const yyyymmdd = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
    return yyyymmdd
  }

  /**
   * Convert yyyy-mm-dd to a date.
   */
  const formatOutputValue = (yyyymmdd) => {
    const [yyyy, mm, dd] = yyyymmdd.split('-')
    const output = new Date(yyyy, mm-1, dd)
    return output
  }

  /**
   * Save start date as timestamp.
   */
  const onStartChange = (e) => {
    if (e.target.value) {
      const value = formatOutputValue(e.target.value)
      onChange(SLUG, dateObj(value, endDate), toolbarValues)
    }
  }

  /**
   * Save end date as timestamp.
   */
  const onEndChange = (e) => {
    if (e.target.value) {
      const value = formatOutputValue(e.target.value)
      onChange(SLUG, dateObj(startDate, value), toolbarValues)
    }
  }

  const dateObj = (startDate, endDate) => {
    return {
      start: startDate.toString(),
      end: endDate.toString(),
    }
  }

  return (
    <div className="daterange">
      <button
        className="toolbar-button"
        title={i18n['date.title'][lang]}
        onClick={onIconClick}
      >
        <i className="toolbar-icon fas fa-calendar-alt" />
      </button>
      {!!popoutIsOpen &&
        <ItemPopout onClose={() => setPopoutIsOpen(false)}>
          <H6 className="field-title">{i18n['date.start'][lang]}</H6>
          <div className="date-field">
            <input
              name="start-date"
              type="date"
              max={formatInputValue(endDate)}
              value={formatInputValue(startDate)}
              onChange={onStartChange}
            />
          </div>
          <H6 className="field-title">{i18n['date.end'][lang]}</H6>
          <div className="date-field">
            <input
              name="end-date"
              type="date"
              min={formatInputValue(startDate)}
              value={formatInputValue(endDate)}
              onChange={onEndChange}
            />
          </div>
          <div className="date-in-words">
            {!!startDate && !!endDate && (
              <>
                {rangeInWords()} {i18n['date-in-words.suffix'][lang]}
              </>
            )}
          </div>
        </ItemPopout>
      }
    </div>
  )
}

export default DateRange
