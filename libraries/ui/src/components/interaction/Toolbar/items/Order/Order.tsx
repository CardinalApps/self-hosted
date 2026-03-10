import { useSelector } from 'react-redux'

import { settingsSelectors } from '../../../../../store/slices/settings'
import { layoutSelectors } from '../../../../../store/slices/layout'

import { CommonOrderParams } from '../../../../../store/types/api'
import { ToolbarItemProps, ToolbarItem } from '../../types'

import i18n from './i18n'

import './Order.css'

export const SLUG = ToolbarItem.ORDER
export const DEFAULT_VALUE: CommonOrderParams = 'ASC'

/**
 * This toolbar item is used for setting the order (ascending or descending) of
 * the content.
 *
 * asc = A-z, 0-9
 * desc = z-A, 9-0
 */
const ToolbarOrder = ({
  toolbarName,
  onChange = () => {},
}: ToolbarItemProps) => {
  const { lang } = useSelector(settingsSelectors.current)
  const { [toolbarName]: toolbarValues } = useSelector(layoutSelectors.toolbarValues)
  const order = toolbarValues?.order || DEFAULT_VALUE

  const onIconClick = () => {
    const newVal = order === 'ASC' ? 'DESC' : 'ASC'
    onChange(SLUG, newVal, toolbarValues)
  }

  return (
    <div className="order">
      <button
        className="toolbar-button"
        title={i18n[`order.${order}`]?.[lang]}
        onClick={onIconClick}
      >
        {order === 'ASC'
          ? <i className="toolbar-icon fas fa-sort-amount-up-alt" />
          : <i className="toolbar-icon fas fa-sort-amount-down-alt" />
        }
      </button>
    </div>
  )
}

export default ToolbarOrder
