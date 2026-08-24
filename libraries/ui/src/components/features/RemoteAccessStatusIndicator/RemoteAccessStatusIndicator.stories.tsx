import type { Meta, StoryObj } from '@storybook/react'

import RemoteAccessStatusIndicator from './RemoteAccessStatusIndicator'

import { store } from '../../../store'
import { remoteAccessActions } from '../../../store/slices/remoteAccess'

/*
 * Each story seeds the store for its own instanceId before rendering, so the hook finds an entry
 * and never negotiates against a real matchmaker.
 */
store.dispatch(remoteAccessActions.connectionRequested({ instanceId: 'story-negotiating' }))
store.dispatch(remoteAccessActions.connectionResolved({
  instanceId: 'story-direct',
  plan: {
    kind: 'direct',
    url: 'https://192-168-1-40.story-direct.connect.cardinalapps.host:3443',
    candidates: [
      { kind: 'lan', hostname: '192-168-1-40.story-direct.connect.cardinalapps.host', port: 3443, url: 'https://192-168-1-40.story-direct.connect.cardinalapps.host:3443' },
      { kind: 'wan', hostname: 'story-direct.connect.cardinalapps.host', port: 24900, url: 'https://story-direct.connect.cardinalapps.host:24900' },
    ],
    fallbackRelayUrl: 'https://relay.cardinalapps.host/relay/story-direct',
  },
}))
store.dispatch(remoteAccessActions.connectionResolved({
  instanceId: 'story-relay',
  plan: { kind: 'relay', url: 'https://relay.cardinalapps.host/relay/story-relay' },
}))
store.dispatch(remoteAccessActions.connectionResolved({
  instanceId: 'story-offline',
  plan: { kind: 'offline' },
}))
store.dispatch(remoteAccessActions.connectionFailed({
  instanceId: 'story-error',
  error: 'Could not reach the matchmaker',
}))
store.dispatch(remoteAccessActions.connectionResolved({
  instanceId: 'story-gated',
  plan: { kind: 'offline' },
}))

const meta = {
  title: 'Feature/RemoteAccessStatusIndicator',
  component: RemoteAccessStatusIndicator,
} satisfies Meta<typeof RemoteAccessStatusIndicator>
type Story = StoryObj<typeof meta>

export default meta

export const Negotiating: Story = {
  args: { instanceId: 'story-negotiating' },
}

export const Direct: Story = {
  args: { instanceId: 'story-direct' },
}

export const Relay: Story = {
  args: { instanceId: 'story-relay' },
}

export const Offline: Story = {
  args: { instanceId: 'story-offline' },
}

export const Error: Story = {
  args: { instanceId: 'story-error' },
}

export const NotApproved: Story = {
  args: { instanceId: 'story-gated', state: 'not_approved' },
}

export const Suspended: Story = {
  args: { instanceId: 'story-gated', state: 'suspended' },
}
