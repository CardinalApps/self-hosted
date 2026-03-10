import { useSelector } from 'react-redux'

import NumberInput from '../../../../forms/NumberInput'
import Icon from '../../../../typography/Icon'

import { settingsSelectors } from '../../../../../store/slices/settings'
import { layoutSelectors } from '../../../../../store/slices/layout'

import { formatWithCommas } from '../../../../../lib/formatting/number'

import { ToolbarItemProps, ToolbarItem } from '../../types'

import i18n from './i18n'

import './Pagination.css'

export const SLUG = ToolbarItem.PAGINATION

export type PaginationValue = {
  take: number,
  skip: number,
}

export const DEFAULT_VALUE: PaginationValue = {
  take: 10,
  skip: 0,
}

/**
 * This toolbar item is used for setting the pagination options.
 */
const Pagination = ({
  toolbarName,
  item,
  numArchiveItems,
  onChange = () => {},
}: ToolbarItemProps) => {
  const { lang } = useSelector(settingsSelectors.current)
  const { [toolbarName]: toolbarValues } = useSelector(layoutSelectors.toolbarValues)
  const slug = item?.slug || SLUG
  const pagination = toolbarValues[slug] as PaginationValue

  const paginationIsEnabled = () => {
    return pagination?.take !== null && pagination?.skip !== null && !!numArchiveItems
  }

  const getCurrentPageNum = () => {
    const currentLastItem = pagination.skip + pagination.take
    return paginationIsEnabled()
      ? currentLastItem / pagination.take
      : 0
  }

  const getTotalPages = () => {
    return paginationIsEnabled()
      ? Math.ceil(numArchiveItems / pagination?.take)
      : 0
  }

  const prevPage = () => {
    const newPage = getCurrentPageNum() - 2

    // Stay within bounds
    if (newPage < 0) {
      return
    }

    onChange(
      slug,
      {
        ...pagination,
        skip: newPage * pagination.take,
      },
      toolbarValues,
    )
  }

  const nextPage = () => {
    const newSkip = getCurrentPageNum() * pagination.take

    // Stay within bounds
    if (newSkip >= numArchiveItems) {
      return
    }

    onChange(
      slug,
      {
        ...pagination,
        skip: newSkip,
      },
      toolbarValues,
    )
  }

  const goToPage = (pageNum) => {
    let newSkip = (pageNum - 1) * pagination.take

    // Stay within bounds
    if (newSkip >= numArchiveItems) {
      newSkip = (getTotalPages() - 1) * pagination.take
    }
    if (newSkip < 0) {
      newSkip = 0
    }

    onChange(
      slug,
      {
        ...pagination,
        skip: newSkip,
      },
      toolbarValues,
    )
  }

  return paginationIsEnabled() &&
    <div className="toolbar-pagination">
      <div className="pagination-control">
        <Icon
          onClick={prevPage}
          fa="fas fa-long-arrow-alt-left"
          iconClassName="toolbar-icon"
        />
      </div>
      <div className="pagination-control">
        <p className="toolbar-current-page toolbar-text">
          {i18n['pagination.page.prefix'][lang]}
        </p>
        <NumberInput
          value={getCurrentPageNum()}
          size="s"
          onChange={(v) => {
            goToPage(v)
          }}
          onBlur={(v) => {
            if (!v) {
              goToPage(getCurrentPageNum())
            }
          }}
          style={{
            width: Math.max((getCurrentPageNum().toString().length * 8) + 30, 30),
          }}
        />
        <p className="toolbar-current-page toolbar-text">
          {i18n['pagination.page.suffix'][lang]
            .replace('{total}', formatWithCommas(getTotalPages()))
          }
        </p>
      </div>
      <div className="pagination-control">
        <Icon
          onClick={nextPage}
          fa="fas fa-long-arrow-alt-right"
          iconClassName="toolbar-icon"
        />
      </div>
    </div>
}

export default Pagination
