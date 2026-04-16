import { useSelector } from 'react-redux'

import { settingsSelectors } from '../../../../../store/slices/settings'
import { layoutSelectors } from '../../../../../store/slices/layout'
import { ToolbarItem, ToolbarItemProps } from '../../types'
import { formatWithCommas } from '../../../../../lib/formatting/number'
import Deselect from '../Deselect'
import Delete from '../Delete'

import i18n from '../../i18n'

export const SLUG = ToolbarItem.SELECTION

export type SelectionExtra = {
  onClearSelection?: () => void,
  onDeleteSelection?: () => void,
}

type SelectionItemProps = ToolbarItemProps & {
  virtualViewName?: string,
  numArchiveItems?: number,
  numItemsSelected?: number,
  itemNameSingular?: string,
  itemNamePlural?: string,
}

const ToolbarSelection = ({
  item,
  virtualViewName,
  numArchiveItems,
  numItemsSelected,
  itemNameSingular,
  itemNamePlural,
}: SelectionItemProps) => {
  const { lang } = useSelector(settingsSelectors.current)
  const { [virtualViewName]: virtualView } = useSelector(layoutSelectors.virtualViews)
  const { onClearSelection, onDeleteSelection } = (item?.extra ?? {}) as SelectionExtra

  const total = virtualViewName ? virtualView?.total : numArchiveItems

  if (!total || !numItemsSelected) {
    return null
  }

  const itemName = total === 1
    ? itemNameSingular ?? i18n['item.singular.default'][lang]
    : itemNamePlural ?? i18n['item.plural.default'][lang]

  return (
    <>
      <p className="toolbar-total-items toolbar-text">
        {i18n['selected-items'][lang]
          .replace('{selected}', formatWithCommas(numItemsSelected))
          .replace('{total}', formatWithCommas(total))
          .replace('{item}', itemName)
        }
      </p>
      <div className="toolbar-item">
        <Deselect onClick={onClearSelection} />
      </div>
      {!!onDeleteSelection &&
        <div className="toolbar-item">
          <Delete onClick={onDeleteSelection} />
        </div>
      }
    </>
  )
}

export default ToolbarSelection
