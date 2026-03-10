import { useDispatch } from 'react-redux'
import { Meta, StoryObj } from '@storybook/react'

import Toast from './Toast'
import Toaster from './Toaster'

import Button from '../Button'

import { toastActions } from '../../../store/slices/toast'

const meta = {
  title: 'Interaction/Toast',
  component: Toast,
  argTypes: {},
} satisfies Meta<typeof Toast>
type Story = StoryObj<typeof meta>

export const JustATitle: Story = {
  args: {
    title: 'Something good has happened',
  },
}

export const WithAMessage: Story = {
  args: {
    title: 'This is the title',
    body: `<p>You got mail.</p><p>The body of the toast can have paragraphs. If there's a lot of text, it looks like this.</p>`,
  },
}

export const AllDressed: Story = {
  args: {
    title: 'This is the title',
    body: `<p>You got mail.</p><p>The body of the toast can have paragraphs. If there's a lot of text, it looks like this.</p>`,
    controls: (
      <>
        <Button onClick={() => alert('Clicky')}>Take Action</Button>
        <Button onClick={() => alert('Clicky')}>Do something</Button>
      </>
    ),
  },
}

export const Closeable: Story = {
  args: {
    title: 'Something good has happened',
    showClose: true,
    onClose: () => alert('You clicked close'),
  },
}

export const TTL: Story = {
  args: {
    type: 'warning',
    title: 'I will fade out in 5 seconds',
    ttl: 5000,
    onClose: () => console.log('onClose() after fade out'),
  },
}

export const DoAToast = () => {
  const dispatch = useDispatch()

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15 }}>
        <div style={{ width: '100%', gap: 15, display: 'flex' }}>
          <Button
            onClick={() => dispatch(toastActions.addToQueue({
              title: `You dispatched this toast`,
              ttl: 3000,
            }))}>
              Default, 3000 TTL
          </Button>
          <Button
            onClick={() => dispatch(toastActions.addToQueue({
              type: `warning`,
              title: `You dispatched this toast`,
              ttl: 3000,
            }))}>
              Warning, 3000 TTL
          </Button>
          <Button
            onClick={() => dispatch(toastActions.addToQueue({
              type: `danger`,
              title: `You dispatched this toast`,
              body: 'More information: <a href="https://help.cardinalapps.io/help-codes/ERR_CP_0010">help.cardinalapps.io/help-codes/ERR_CP_0010</a>',
              ttl: 3000,
            }))}>
              Error, 3000 TTL
          </Button>
        </div>
        <div style={{ width: '100%', gap: 15, display: 'flex' }}>
          <Button
            onClick={() => dispatch(toastActions.addToQueue({
              type: 'success',
              title: `You dispatched this toast`,
              showClose: true,
            }))}>
              Default, no TTL
          </Button>
          <Button
            onClick={() => dispatch(toastActions.addToQueue({
              type: 'warning',
              title: `You dispatched this toast`,
              showClose: true,
            }))}>
              Warning, no TTL
          </Button>
          <Button
            onClick={() => dispatch(toastActions.addToQueue({
              type: 'danger',
              title: `You dispatched this toast`,
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
