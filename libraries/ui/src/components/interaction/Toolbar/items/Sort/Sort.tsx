import { useSelector } from 'react-redux'

import Select from '../../../../forms/Select'

import { settingsSelectors } from '../../../../../store/slices/settings'
import { layoutSelectors } from '../../../../../store/slices/layout'

import i18n from './i18n'

import { ToolbarItemProps, ToolbarItem, ToolbarItemObject } from '../../types'

import './Sort.css'

export const SLUG = ToolbarItem.SORT
export const DEFAULT_VALUE = 'date_added'

export interface SortToolbarItemObject extends ToolbarItemObject {
  options: {
    value: string,
    label: string,
    sentenceCase: string,
  }[],
  extra: {
    value: string,
    label: string,
    sentenceCase: string,
  }[],
}

interface SortToolbarItemProps extends ToolbarItemProps {
  item: SortToolbarItemObject
}

/**
 * This toolbar item is used for setting the sort directive for the page
 * content. Pages can choose which default directives to support, and can extend
 * the directives with custom ones.
 */
const ToolbarSort = ({
  toolbarName,
  item,
  onChange = () => {},
}: SortToolbarItemProps) => {
  const { lang } = useSelector(settingsSelectors.current)
  const { [toolbarName]: toolbarValues } = useSelector(layoutSelectors.toolbarValues)
  const slug = item?.slug || SLUG

  const SORT_OPTIONS = [
    {
      value: 'date_added',
      label: i18n['sort.date_added'][lang],
      sentenceCase: i18n['sort.date_added'][lang].toLocaleLowerCase(),
    },
    {
      value: 'name',
      label: i18n['sort.name'][lang],
      sentenceCase: i18n['sort.name'][lang].toLocaleLowerCase(),
    },
    {
      value: 'random',
      label: i18n['sort.random'][lang],
      sentenceCase: i18n['sort.random'][lang].toLocaleLowerCase(),
    },
  ]

  const getOptions = () => {
    if (item?.options) {
      return item.options
    } else {
      return [
        ...SORT_OPTIONS,
        ...(item?.extra || []),
      ]
    }
  }

  return (
    <div className="sort">
      <Select
        name={slug}
        selectPlaceholder={i18n['sort-by'][lang]}
        selectedPrefix={`${i18n['sort-by'][lang]} `}
        size="s"
        multi={false}
        value={toolbarValues?.[slug] as string || item?.initialValue as string}
        options={getOptions()}
        onChange={(value) => onChange(slug, value, toolbarValues)}
      />
    </div>
  )
}

export default ToolbarSort
