import react, { useState } from 'react'
import type { JSXElementConstructor, PropsWithChildren, ReactElement } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import Pagination from '../Pagination'
import Loading from '../../layout/Loading'

import { settingsSelectors } from '../../../store/slices/settings'

import i18n from './i18n'

import './Table.css'

type TableColumnProps = {
  className?: string,
  index?: number,
  align?: 'left' | 'right' | 'center',
  width?: number | string,
  title?: string,
  onMouseEnter?: () => void,
  onMouseLeave?: () => void,
}
export type TableColumn = ReactElement<TableColumnProps, string | JSXElementConstructor<TableColumnProps>>
export type TableRow = TableColumn[]

type TableProps = {
  className?: string,
  headerRowClassName?: string,
  bodyRowClassName?: string,
  header?: TableColumn[],
  body?: TableRow[],
  page?: number,
  maxPages?: number,
  onPageChange?: (newPage: number) => void,
  loading?: boolean,
  emptyMessage?: string,
  highlightRowOnHover?: boolean,
  highlightColOnHover?: boolean,
  emptyIcon?: string,
}

/**
 * Allows the user to input search queries.
 */
const Table = ({
  className,
  headerRowClassName,
  bodyRowClassName,
  header = [],
  body = [],
  page,
  maxPages,
  onPageChange,
  loading = false,
  emptyMessage,
  highlightRowOnHover = true,
  highlightColOnHover,
}: TableProps) => {
  const [rowHighlight, setRowHighlight] = useState<number>()
  const [colHighlight, setColHighlight] = useState<number>()
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <div className={clsx(
      `table-box`,
      className,
      !!loading && 'loading',
      !!highlightRowOnHover && 'row-highlights',
      !!highlightColOnHover && 'col-highlights',
    )}>
      <div className="table-layout">
        <table className="table">
          <thead className="thead">
            <tr className={clsx('tr', headerRowClassName)}>
              {/* FIXME we need a Table.Header component for <th> */}
              {!!header.length && header.map((head, index) => (
                <th
                  key={`th-${index}`}
                  className="th"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          {loading
            ? <tbody className="tbody">
                <tr>
                  <td className="table-loading-icon" colSpan={header?.length}>
                    <Loading/>
                  </td>
                </tr>
              </tbody>
            : body.length
              ? <tbody className="tbody">
                  {body.map((row, rowIndex) => (
                    <tr
                      key={`row-${rowIndex}`}
                      className={clsx('tr', bodyRowClassName)}
                    >
                      {!!row.length && row.map((col, index) => (
                        react.cloneElement(col, {
                          className: clsx("td", colHighlight === index || rowHighlight === rowIndex ? 'highlight' : ''),
                          index,
                          onMouseEnter: () => {
                            if (highlightColOnHover) {
                              setColHighlight(index)
                            }
                            if (highlightRowOnHover) {
                              setRowHighlight(rowIndex)
                            }
                          },
                          onMouseLeave: () => {
                            setColHighlight(null)
                            setRowHighlight(null)
                          },
                        })
                      ))}
                    </tr>
                  ))}
                </tbody>
              : <tbody className="tbody empty">
                  <tr className="table-empty-message">
                    <td colSpan={header?.length}>
                      <div>
                        <p>{emptyMessage || i18n['default-empty-table-message'][lang]}</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
          }
        </table>
      </div>
      {page && maxPages && onPageChange && (
        <div className="table-pagination">
          <Pagination page={page} maxPages={maxPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  )
}

Table.Col = (props: PropsWithChildren<TableColumnProps>) => {
  const {
    className,
    align,
    index = 0,
    width,
    title,
    onMouseEnter,
    onMouseLeave,
    children,
  } = props
  return (
    <td
      key={`col-${index}`}
      width={width}
      className={className}
      align={align !== 'center' ? align : undefined}
      title={title}
      style={align === 'center' ? { textAlign: 'center' } : {}}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </td>
  )
}

export default Table
