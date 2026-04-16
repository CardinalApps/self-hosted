import { useSelector } from 'react-redux'

import { settingsSelectors } from '../../../../../store/slices/settings'
import { layoutSelectors } from '../../../../../store/slices/layout'
import { ToolbarItem, ToolbarItemProps } from '../../types'
import { formatWithCommas } from '../../../../../lib/formatting/number'

import i18n from '../../i18n'

export const SLUG = ToolbarItem.SIMPLECOUNT

type SimpleCountItemProps = ToolbarItemProps & {
  virtualViewName?: string,
  numArchiveItems?: number,
  numItemsSelected?: number,
  numShowingItems?: number | string,
  itemNameSingular?: string,
  itemNamePlural?: string,
}

const ToolbarSimpleCount = ({
  virtualViewName,
  numArchiveItems,
  numItemsSelected,
  numShowingItems,
  itemNameSingular,
  itemNamePlural,
}: SimpleCountItemProps) => {
  const { lang } = useSelector(settingsSelectors.current)
  const { [virtualViewName]: virtualView } = useSelector(layoutSelectors.virtualViews)

  if (!numArchiveItems) {
    return null
  }

  const total = virtualViewName ? virtualView?.total : numArchiveItems

  if (!total || numItemsSelected || numShowingItems) {
    return null
  }

  const itemName = total === 1
    ? itemNameSingular ?? i18n['item.singular.default'][lang]
    : itemNamePlural ?? i18n['item.plural.default'][lang]

  return (
    <p className="toolbar-total-items toolbar-text">
      {i18n['total-items'][lang]
        .replace('{total}', formatWithCommas(total))
        .replace('{item}', itemName)
      }
    </p>
  )
}

export default ToolbarSimpleCount
