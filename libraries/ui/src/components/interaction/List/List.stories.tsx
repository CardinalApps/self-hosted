import { fn } from '@storybook/test'
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
      name={'media-folders'}
      items={[
        { name: 'Music', value: 'music', icon: { fa: 'fas fa-music' } },
        { name: 'Photos', value: 'photos', avatar: { type: 'image', image: 'elephant.jpg' } },
        { name: 'Films', value: 'films', icon: { fa: 'fas fa-film' } },
        { name: 'Audiobooks', value: 'audiobooks', icon: { fa: 'fas fa-book' } },
        { name: 'Podcasts', value: 'podcasts' },
        { name: 'A very long library name that might overflow in narrower layouts and should wrap or truncate gracefully', value: 'long-name' },
      ]}
    />
  )
}

export const Controls = () => {
  return (
    <List
      name={'library-controls'}
      items={[
        { name: 'Music', value: 'music', controls: ['add', 'remove', 'delete'], icon: { fa: 'fas fa-music' } },
        { name: 'Photos', value: 'photos', controls: ['add', 'remove', 'delete'], avatar: { type: 'image', image: 'birb.jpg' } },
        { name: 'Films', value: 'films', controls: ['add', 'remove', 'delete'], icon: { fa: 'fas fa-film' } },
        { name: 'Audiobooks', value: 'audiobooks', controls: ['remove', 'delete'] },
        { name: 'Podcasts', value: 'podcasts', controls: ['add'] },
        { name: 'A very long library name that might overflow in narrower layouts', controls: ['add', 'remove', 'delete'] },
      ]}
      onAdd={fn()}
      onRemove={fn()}
      onDelete={fn()}
    />
  )
}

export const ControlsPending = () => {
  return (
    <List
      name={'pending-list'}
      items={[
        { name: 'Music', value: 'music', controls: ['remove'] },
        { name: 'Photos — pending add', value: 'photos', pendingAdd: true, controls: ['remove'] },
        { name: 'Films — pending delete', value: 'films', pendingDelete: true, controls: ['delete'] },
        { name: 'Audiobooks', value: 'audiobooks', controls: ['add', 'remove', 'delete'] },
        { name: 'Podcasts', value: 'podcasts', controls: ['add', 'remove', 'delete'] },
      ]}
      onAdd={fn()}
      onRemove={fn()}
      onDelete={fn()}
    />
  )
}

export const Compact = () => {
  return (
    <List
      name={'compact-list'}
      layout={'compact'}
      items={[
        { name: 'Music', value: 'music', controls: ['remove'] },
        { name: 'Photos', value: 'photos', pendingAdd: true, controls: ['remove'] },
        { name: 'Films', value: 'films', pendingDelete: true, controls: ['delete'] },
        { name: 'Audiobooks', value: 'audiobooks', controls: ['add', 'remove', 'delete'] },
        { name: 'Podcasts', value: 'podcasts', controls: ['add', 'remove', 'delete'] },
      ]}
      onAdd={fn()}
      onRemove={fn()}
      onDelete={fn()}
    />
  )
}

export const KeyValue = () => {
  return (
    <List
      name={'server-info'}
      layout={'compact'}
      items={[
        { name: 'Server Version', label: '2.4.1' },
        { name: 'Node.js', label: '18.12.0' },
        { name: 'Database', label: 'SQLite 3.40.0' },
        { name: 'Uptime', label: '14 days, 3 hours' },
        { name: 'Media Items', label: '42,731', controls: ['add', 'remove'] },
      ]}
      onAdd={fn()}
      onRemove={fn()}
    />
  )
}

export const Empty = () => {
  return (
    <List
      name={'empty-list'}
      items={[]}
    />
  )
}

export default meta
