import type { Meta } from '@storybook/react'

import List from './List'

const meta = {
  title: 'Interaction/List',
  component: List,
  argTypes: {},
} satisfies Meta<typeof List>

export const Default = () => {
  return (
    <List
      name={'form-list'}
      items={[
        { name: <span data-test>Item 1</span> },
        { name: 'Item 2', value: 'item-2', avatar: { type: 'image', image: 'elephant.jpg' } },
        { name: 'Item 3', value: 'item-3' },
        { name: 'Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4', value: 'item-4' },
        { name: 'Item 5', value: 'item-5' },
        { name: 'Item 6', value: 'item-6' },
        { name: 'Item 6', value: 'item-6', label: 'Rows can have this additional label. Rows can have this additional label. Rows can have this additional label. Rows can have this additional label. Rows can have this additional label. Rows can have this additional label. Rows can have this additional label. Rows can have this additional label. Rows can have this additional label. Rows can have this additional label.' },
      ]}
    />
  )
}

export const Controls = () => {
  return (
    <List
      name={'controls-list'}
      items={[
        { name: 'Item 1' },
        { name: 'Item 2', value: 'item-2', controls: ['add', 'remove', 'delete'], avatar: { type: 'image', image: 'birb.jpg' } },
        { name: 'Item 3', value: 'item-3', controls: ['add', 'remove', 'delete'] },
        { name: 'Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4', controls: ['add', 'remove', 'delete'], icon: { fa: 'fas fa-x-ray' } },
        { name: 'Item 5', value: 'item-5', controls: ['add', 'remove', 'delete'] },
        { name: 'Item 6', value: 'item-6', controls: ['add', 'remove', 'delete'] },
      ]}
      onAdd={(item) => console.log('onAdd', item)}
      onRemove={(item) => console.log('onRemove', item)}
      onDelete={(item) => console.log('onDelete', item)}
    />
  )
}

export const Buttons = () => {
  return (
    <List
      name={'controls-list'}
      items={[
        { name: 'Item 1' },
        { name: 'Item 2', value: 'item-2', controls: ['add', 'remove', 'delete'], avatar: { type: 'image', image: 'birb.jpg' } },
        { name: 'Item 3', value: 'item-3', controls: ['add', 'remove', 'delete'] },
        { name: 'Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4', controls: ['add', 'remove', 'delete'], icon: { fa: 'fas fa-x-ray' } },
        { name: 'Item 5', value: 'item-5', controls: ['add', 'remove', 'delete'] },
        { name: 'Item 6', value: 'item-6', controls: ['add', 'remove', 'delete'] },
      ]}
      onAdd={(item) => console.log('onAdd', item)}
      onRemove={(item) => console.log('onRemove', item)}
      onDelete={(item) => console.log('onDelete', item)}
    />
  )
}

export const ControlsPending = () => {
  return (
    <List
      name={'controls-list'}
      items={[
        { name: 'Item 1' },
        { name: 'Pending add', value: 'item-2', pendingAdd: true, controls: ['remove'] },
        { name: 'Pending delete', value: 'item-3', pendingDelete: true, controls: ['delete'] },
        { name: 'Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4', controls: ['add', 'remove', 'delete'] },
        { name: 'Item 5', value: 'item-5', controls: ['add', 'remove', 'delete'] },
        { name: 'Item 6', value: 'item-6', controls: ['add', 'remove', 'delete'] },
      ]}
      onAdd={(item) => console.log('onAdd', item)}
      onRemove={(item) => console.log('onRemove', item)}
      onDelete={(item) => console.log('onDelete', item)}
    />
  )
}

export const Compact = () => {
  return (
    <List
      name={'controls-list'}
      layout={'compact'}
      items={[
        { name: 'Item 1' },
        { name: 'Pending add', value: 'item-2', pendingAdd: true, controls: ['remove'] },
        { name: 'Pending delete', value: 'item-3', pendingDelete: true, controls: ['delete'] },
        { name: 'Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4 Item 4', controls: ['add', 'remove', 'delete'] },
        { name: 'Item 5', value: 'item-5', controls: ['add', 'remove', 'delete'] },
        { name: 'Item 6', value: 'item-6', controls: ['add', 'remove', 'delete'] },
      ]}
      onAdd={(item) => console.log('onAdd', item)}
      onRemove={(item) => console.log('onRemove', item)}
      onDelete={(item) => console.log('onDelete', item)}
    />
  )
}

export const KeyValue = () => {
  return (
    <List
      name={'controls-list'}
      layout={'compact'}
      items={[
        { name: 'The List component can be used to display key-value pairs.', label: "Value 1" },
        { name: 'Key 2', label: 'Value 2' },
        { name: 'Key 3', value: 'item-3', label: "Value 3", controls: ['add', 'remove', 'delete'] },
      ]}
      onAdd={(item) => console.log('onAdd', item)}
      onRemove={(item) => console.log('onRemove', item)}
      onDelete={(item) => console.log('onDelete', item)}
    />
  )
}

export const Empty = () => {
  return (
    <List
      name={'form-list'}
      items={[]}
    />
  )
}

export default meta
