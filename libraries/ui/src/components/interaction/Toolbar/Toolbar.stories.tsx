import { useState } from 'react'
import type { Meta } from '@storybook/react'
import { useSelector } from 'react-redux'
import ms from 'ms'
import { useAppSelector } from '../../../hooks/useAppSelector'

import Toolbar from './Toolbar'

import Select from '../../forms/Select'
import { DrawerLayer } from '../../layout/Drawer'

import { layoutSelectors } from '../../../store/slices/layout'
import { ToolbarItem } from './types'
import { PaginationValue } from './items/Pagination/Pagination'

const meta = {
  title: 'Interaction/Toolbar',
  component: Toolbar,
  argTypes: {},
} satisfies Meta<typeof Toolbar>

export const DefaultItems = (props) => {
  return (
    <div>
      <DrawerLayer />
      <Toolbar
        {...props}
        name="story-default-items"
        items={[
          {
            slug: 'order',
            render: ToolbarItem.ORDER,
            initialValue: 'desc',
          },
          {
            slug: 'daterange',
            render: ToolbarItem.DATERANGE,
          },
          {
            slug: 'sort',
            render: ToolbarItem.SORT,
            initialValue: 'date_added',
          },
        ]}
        numArchiveItems={100}
      />
    </div>
  )
}

export const CustomValues = (props) => {
  const toolbarName = 'story-custom-values'
  return (
    <div>
      <DrawerLayer />
      <Toolbar
        {...props}
        name={toolbarName}
        items={[
          {
            slug: 'daterange',
            initialValue: {
              start: new Date(Date.now() - ms('12 days')),
              end: new Date(),
            },
            render: ToolbarItem.DATERANGE,
          },
          {
            slug: 'daterange',
            initialValue: 'date_added',
            extra: [
              {
                label: 'Extended sort 1',
                value: 'extended_sort_1',
              },
              {
                label: 'Extended sort 2',
                value: 'extended_sort_2',
              },
            ],
            render: ToolbarItem.SORT,
          },
          {
            slug: 'sort_custom',
            initialValue: 'custom_sort_1',
            options: [
              {
                label: 'Custom sort 1',
                value: 'custom_sort_1',
              },
              {
                label: 'Custom sort 2',
                value: 'custom_sort_2',
              },
            ],
            render: ToolbarItem.SORT,
          },
          {
            slug: 'custom-dropdown',
            initialValue: [],
            render: function({ onChange }) {
              const { [toolbarName]: toolbarValues } = useAppSelector(layoutSelectors.toolbarValues)
              return (
                <Select
                  name={'custom-dropdown'}
                  selectPlaceholder={'Custom dropdown'}
                  size="s"
                  value={toolbarValues?.['custom-dropdown'] ? toolbarValues['custom-dropdown'] as string : []}
                  options={{
                    'custom-1': 'Custom item 1',
                    'custom-2': 'Custom item 2',
                    'custom-3': 'Custom item 3',
                  }}
                  onChange={(value) => onChange('custom-dropdown', value)}
                />
              )
            },
          },
        ]}
      />
    </div>
  )
}

export const Groups = (props) => {
  return (
    <div>
      <DrawerLayer />
      <Toolbar
        {...props}
        name="story-groups"
        numArchiveItems={100}
        items={[
          [
            {
              slug: 'order',
              initialValue: 'desc',
              render: ToolbarItem.ORDER,
            },
            {
              slug: 'daterange',
              render: ToolbarItem.DATERANGE,
            },
          ],
          [
            {
              slug: 'sort',
              initialValue: 'date_added',
              render: ToolbarItem.SORT,
            },
          ],
        ]}
      />
    </div>
  )
}

export const Selection = (props) => {
  const init = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
    8: false,
    9: false,
    10: false,
  }
  const [selected, setSelected] = useState<Record<number, boolean>>(init)

  return (
    <div>
      <DrawerLayer />
      <Toolbar
        {...props}
        name="story-selection"
        numArchiveItems={Object.keys(selected).length}
        numItemsSelected={Object.values(selected).filter((v) => !!v).length}
        onClearSelection={() => {
          const updated = {}
          Object.keys(selected).forEach((v, i) => (updated[i+1] = false))
          setSelected(updated)
        }}
        onDeleteSelection={() => {
          const updated = {}
          // only keep unselected items
          for (const [key, value] of Object.entries(selected)) {
            if (!value) {
              updated[key] = value
            }
          }
          setSelected(updated)
        }}
        onReset={() => setSelected(init)}
      />
      <ol style={{ listStyleType: 'numeric', padding: '0 0 0 20px' }}>
        {Object.keys(selected).map((key) => (
          <li key={key}>
            <input
              type="checkbox"
              checked={selected[key]}
              onChange={(checkbox) => {
                if (checkbox.target.checked) {
                  const updated = { ...selected, [key]: true }
                  setSelected(updated)
                } else {
                  const updated = { ...selected, [key]: false }
                  setSelected(updated)
                }
              }}
            />
          </li>
        ))}
      </ol>
    </div>
  )
}

export const Pagination = (props) => {
  const toolbarName = 'story-pagination'
  const initialValue = {
    take: 10,
    skip: 0,
  }
  const numArchiveItems = 500000
  const items = [...Array(numArchiveItems)].map((item, i) => i)

  function PaginationReader() {
    const { [toolbarName]: toolbarValues } = useSelector(layoutSelectors.toolbarValues)
    const values = toolbarValues?.pagination as PaginationValue || initialValue
    const { take, skip } = values
    return (
      <>
        <div>
          [Take={take}] [Skip={skip}]
        </div>
        <hr />
        <div>
          {items.slice(skip, take + skip).map((item) => {
            return <div key={item + 1}>{item + 1}</div>
          })}
        </div>
      </>
    )
  }

  return (
    <div>
      <DrawerLayer />
      <Toolbar
        {...props}
        name={toolbarName}
        items={[
          {
            slug: 'pagination',
            render: 'pagination',
            initialValue,
          },
        ]}
        numShowingItems={initialValue.take}
        numArchiveItems={numArchiveItems}
      />
      <PaginationReader />
    </div>
  )
}

export default meta
