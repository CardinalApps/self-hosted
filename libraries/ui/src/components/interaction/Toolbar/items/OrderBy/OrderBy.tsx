import { useSelector } from 'react-redux'

import Select from '../../../../forms/Select'

import { settingsSelectors } from '../../../../../store/slices/settings'
import { layoutSelectors } from '../../../../../store/slices/layout'

import i18n from './i18n'

import {
  ToolbarItemProps,
  ToolbarItem,
  ToolbarItemObject,
  ToolbarOrderByType,
  ToolbarOrderByDropdownType,
} from '../../types'

import './OrderBy.css'

export const SLUG = ToolbarItem.ORDERBY
export const DEFAULT_VALUE = 'createdAt'

export interface SortToolbarItemObject extends ToolbarItemObject {
  options: ToolbarOrderByDropdownType,
}

interface SortToolbarItemProps extends ToolbarItemProps {
  item: SortToolbarItemObject,
}

/**
 * This toolbar item is used for setting the sort directive for the page
 * content. Pages can choose which default directives to support, and can extend
 * the directives with custom ones.
 */
const ToolbarOrderByDropdown = ({
  toolbarName,
  item,
  onChange = () => {},
}: SortToolbarItemProps) => {
  const { lang } = useSelector(settingsSelectors.current)
  const { [toolbarName]: toolbarValues } = useSelector(layoutSelectors.toolbarValues)
  const slug = item?.slug || SLUG

  const getOptions = () => {
    return item.options.map((option: ToolbarOrderByType) => {
      return {
        value: option,
        label: i18n[`orderby.${option}`]?.[lang] || option,
        sentenceCase: i18n[`orderby.${option}`]?.[lang] || option,
      }
    })
  }

  return (
    <div className="sort">
      <Select
        name={slug}
        selectPlaceholder={i18n['orderby'][lang]}
        selectedPrefix={`${i18n['orderby'][lang]} `}
        size="s"
        multi={false}
        min={1}
        value={toolbarValues?.[slug] as string || item?.initialValue as string}
        options={getOptions()}
        onChange={(value) => onChange(slug, value, toolbarValues)}
      />
    </div>
  )
}

export default ToolbarOrderByDropdown
