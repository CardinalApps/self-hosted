import { fn } from '@storybook/test'
import { useDispatch } from 'react-redux'
import { Meta, StoryObj } from '@storybook/react'

import Toast from './Toast'
import Toaster from './Toaster'
import Button from '../Button'

import { toastActions } from '../../../store/slices/toast'

const meta = {
  title: 'Interaction/Toast',
  component: Toast,
  argTypes: {
    title: { control: 'text', table: { category: 'Content' } },
    body: { control: 'text', table: { category: 'Content' } },
    type: {
      control: { type: 'select' },
      options: [undefined, 'success', 'warning', 'danger'],
      table: { category: 'Appearance' },
    },
    ttl: {
      control: { type: 'number' },
      table: { category: 'Behavior' },
    },
    showClose: { control: 'boolean', table: { category: 'Behavior' } },
  },
} satisfies Meta<typeof Toast>
type Story = StoryObj<typeof meta>

export const JustATitle: Story = {
  args: {
    title: 'Library scan complete',
  },
}

export const WithAMessage: Story = {
  args: {
    title: 'Library scan complete',
    body: '<p>147 new tracks were found and added to your library.</p>',
  },
}

export const AllDressed: Story = {
  args: {
    title: 'New album available',
    body: '<p>Cardinal Music found a new album in your library and it has been added to your collection.</p>',
    controls: (
      <>
        <Button onClick={fn()}>View album</Button>
        <Button onClick={fn()}>Dismiss</Button>
      </>
    ),
  },
}

export const Closeable: Story = {
  args: {
    title: 'Background scan running',
    showClose: true,
    onClose: fn(),
  },
}

export const WithTTL: Story = {
  args: {
    type: 'warning',
    title: 'This toast fades out after 5 seconds',
    ttl: 5000,
    onClose: fn(),
  },
}

export const DoAToast = () => {
  const dispatch = useDispatch()

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ width: '100%', gap: 12, display: 'flex', flexWrap: 'wrap' }}>
          <Button
            onClick={() => dispatch(toastActions.addToQueue({
              title: 'Library scan complete',
              body: '<p>147 new tracks were found.</p>',
              ttl: 3000,
            }))}>
            Success, 3s
          </Button>
          <Button
            onClick={() => dispatch(toastActions.addToQueue({
              type: 'warning',
              title: 'Storage is nearly full',
              ttl: 3000,
            }))}>
            Warning, 3s
          </Button>
          <Button
            onClick={() => dispatch(toastActions.addToQueue({
              type: 'danger',
              title: 'Failed to connect',
              body: 'Check that the server is running and try again.',
              ttl: 3000,
            }))}>
            Error, 3s
          </Button>
        </div>
        <div style={{ width: '100%', gap: 12, display: 'flex', flexWrap: 'wrap' }}>
          <Button
            onClick={() => dispatch(toastActions.addToQueue({
              type: 'success',
              title: 'Changes saved',
              showClose: true,
            }))}>
            Success, no TTL
          </Button>
          <Button
            onClick={() => dispatch(toastActions.addToQueue({
              type: 'warning',
              title: 'Session expiring soon',
              showClose: true,
            }))}>
            Warning, no TTL
          </Button>
          <Button
            onClick={() => dispatch(toastActions.addToQueue({
              type: 'danger',
              title: 'Authentication failed',
              showClose: true,
            }))}>
            Error, no TTL
          </Button>
        </div>
      </div>
      <Toaster
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
        }}
      />
    </div>
  )
}

export default meta
