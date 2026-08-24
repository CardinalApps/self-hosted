import { fn } from '@storybook/test'
import type { Meta } from '@storybook/react'

import List from './List'

const meta = {
  title: 'Interaction/List',
  component: List,
  argTypes: {},
} satisfies Meta<typeof List>

const LONG_URL = 'https://0a6b60bf-352c-4c22-bc72-e85de2be1204.remote.cardinalapps.host'
const LONG_PATH = '/mnt/storage/media/library/music/lossless/incoming/2026/quarter-three/unsorted'

export const Default = () => {
  return (
    <List
      name={'media-folders'}
      items={[
        { label: 'Music', id: 'music', icon: { fa: 'fas fa-music' } },
        { label: 'Photos', id: 'photos', avatar: { type: 'image', image: 'elephant.jpg' } },
        { label: 'Films', id: 'films', icon: { fa: 'fas fa-film' } },
        { label: 'Audiobooks', id: 'audiobooks', icon: { fa: 'fas fa-book' } },
        { label: 'Podcasts', id: 'podcasts' },
        { label: 'A very long library name that might overflow in narrower layouts and should wrap or truncate gracefully', id: 'long-name' },
      ]}
    />
  )
}

export const Controls = () => {
  return (
    <List
      name={'library-controls'}
      items={[
        { label: 'Music', id: 'music', controls: ['add', 'remove', 'delete'], icon: { fa: 'fas fa-music' } },
        { label: 'Photos', id: 'photos', controls: ['add', 'remove', 'delete'], avatar: { type: 'image', image: 'birb.jpg' } },
        { label: 'Films', id: 'films', controls: ['add', 'remove', 'delete'], icon: { fa: 'fas fa-film' } },
        { label: 'Audiobooks', id: 'audiobooks', controls: ['remove', 'delete'] },
        { label: 'Podcasts', id: 'podcasts', controls: ['add'] },
        { label: 'A very long library name that might overflow in narrower layouts', controls: ['add', 'remove', 'delete'] },
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
        { label: 'Music', id: 'music', controls: ['remove'] },
        { label: 'Photos — pending add', id: 'photos', pendingAdd: true, controls: ['remove'] },
        { label: 'Films — pending delete', id: 'films', pendingDelete: true, controls: ['delete'] },
        { label: 'Audiobooks', id: 'audiobooks', controls: ['add', 'remove', 'delete'] },
        { label: 'Podcasts', id: 'podcasts', controls: ['add', 'remove', 'delete'] },
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
        { label: 'Music', id: 'music', controls: ['remove'] },
        { label: 'Photos', id: 'photos', pendingAdd: true, controls: ['remove'] },
        { label: 'Films', id: 'films', pendingDelete: true, controls: ['delete'] },
        { label: 'Audiobooks', id: 'audiobooks', controls: ['add', 'remove', 'delete'] },
        { label: 'Podcasts', id: 'podcasts', controls: ['add', 'remove', 'delete'] },
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
        { label: 'Server Version', value: '2.4.1' },
        { label: 'Node.js', value: '18.12.0' },
        { label: 'Database', value: 'SQLite 3.40.0' },
        { label: 'Uptime', value: '14 days, 3 hours' },
        { label: 'Media Items', value: '42,731', controls: ['add', 'remove'] },
      ]}
      onAdd={fn()}
      onRemove={fn()}
    />
  )
}

/* The layout question this component has to answer: a short key beside a value far too long for
   the row it is in. The key stays whole and the value takes everything that is left. */
export const KeyValueLongValues = () => {
  return (
    <List
      name={'server-info-long-values'}
      layout={'compact'}
      items={[
        { label: 'Public URL', value: LONG_URL, copyable: LONG_URL, controls: ['copy'] },
        { label: 'Instance ID', value: '0a6b60bf-352c-4c22-bc72-e85de2be1204' },
        { label: 'Music folder', value: LONG_PATH },
        { label: 'Build', value: 'Untagged' },
      ]}
    />
  )
}

/* The harder case: both sides want more room than the row has. Neither is allowed to flatten the
   other — the key wraps down to a readable width and the value truncates from a floor of its own. */
export const KeyValueLongBoth = () => {
  return (
    <List
      name={'server-info-long-both'}
      layout={'compact'}
      items={[
        { label: 'Address the outside world dials to reach this server', value: LONG_URL },
        { label: 'Directory this library was last indexed from', value: LONG_PATH },
        { label: 'Last seen', value: 'August 22nd, 2026 at 4:15 PM (about two hours ago)' },
      ]}
    />
  )
}

/* Values are not always text. A node keeps whatever layout it brings and truncates only on ask. */
export const KeyValueRichValues = () => {
  return (
    <List
      name={'server-info-rich-values'}
      layout={'compact'}
      items={[
        {
          label: 'Connection status',
          value: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-circle" style={{ fontSize: '8px', color: 'var(--success-bg)' }} />
              Established
            </span>
          ),
        },
        {
          label: 'Release channel',
          value: <span style={{ textTransform: 'capitalize' }}>development</span>,
        },
        {
          label: 'Documentation',
          value: <a href="https://cardinalapps.io" target="_blank" rel="noreferrer">Read the guide</a>,
        },
        {
          label: 'Signing in to',
          value: (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-compact-disc" />
              Cardinal Music
            </span>
          ),
        },
        {
          label: 'Certificate subject',
          value: <code>{LONG_URL}</code>,
          truncateValue: true,
        },
      ]}
    />
  )
}

/* Narrow containers are where a balance either holds or falls apart, so here it is at 300px. */
export const KeyValueNarrow = () => {
  return (
    <div style={{ width: '300px' }}>
      <List
        name={'server-info-narrow'}
        layout={'compact'}
        items={[
          { label: 'Public URL', value: LONG_URL, copyable: LONG_URL, controls: ['copy'] },
          { label: 'Build', value: 'Untagged' },
          { label: 'Directory this library was last indexed from', value: LONG_PATH },
        ]}
      />
    </div>
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
