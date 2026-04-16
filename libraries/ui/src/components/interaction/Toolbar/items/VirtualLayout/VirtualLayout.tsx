import { useSelector } from 'react-redux'

import { settingsSelectors } from '../../../../../store/slices/settings'
import { layoutSelectors } from '../../../../../store/slices/layout'
import { ToolbarItem, ToolbarItemProps } from '../../types'
import { formatWithCommas } from '../../../../../lib/formatting/number'

import i18n from '../../i18n'

export const SLUG = ToolbarItem.VIRTUALLAYOUT

type VirtualLayoutItemProps = ToolbarItemProps & {
  virtualViewName?: string,
  itemNameSingular?: string,
  itemNamePlural?: string,
}

const ToolbarVirtualLayout = ({ virtualViewName, itemNameSingular, itemNamePlural }: VirtualLayoutItemProps) => {
  const { lang } = useSelector(settingsSelectors.current)
  const { [virtualViewName]: virtualView } = useSelector(layoutSelectors.virtualViews)

  if (!virtualView?.start || !virtualView?.end || !virtualView?.total) {
    return null
  }

  const itemName = virtualView.total === 1
    ? itemNameSingular ?? i18n['item.singular.default'][lang]
    : itemNamePlural ?? i18n['item.plural.default'][lang]

  return (
    <p className="toolbar-total-items toolbar-text">
      {i18n['paginated-items'][lang]
        .replace('{paginated}', `${formatWithCommas(virtualView.start)}-${formatWithCommas(virtualView.end)}`)
        .replace('{total}', formatWithCommas(virtualView.total))
        .replace('{item}', itemName)
      }
    </p>
  )
}

export default ToolbarVirtualLayout
