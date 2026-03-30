import type { Meta, StoryObj } from '@storybook/react'

import P from './P'

const meta = {
  title: 'Typography/P',
  component: P,
  argTypes: {
    children: { control: 'text', table: { category: 'Content' } },
  },
} satisfies Meta<typeof P>
type Story = StoryObj<typeof meta>

export const Single: Story = {
  args: {
    children: 'Cardinal Media Server is a self-hosted media streaming platform that puts you in control of your music, photos, and films. Stream your collection from anywhere, without subscriptions or third-party clouds.',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 600 }}>
        <Story />
      </div>
    ),
  ],
}

export const Multiple = () => {
  return (
    <div style={{ maxWidth: 600 }}>
      <P>Cardinal Media Server is a self-hosted media streaming platform that puts you in control of your music, photos, and films. Stream your collection from anywhere, without subscriptions or third-party clouds.</P>
      <P>Your media is stored on hardware you own and served over a connection you control. Depending on your setup, Cardinal can run on a home server, a VPS, a NAS device, or even a Raspberry Pi.</P>
      <P>All three apps — Cardinal Music, Cardinal Photos, and Cardinal Cinema — connect to the same media server. Once you set up the server, adding new apps is instant.</P>
    </div>
  )
}

export default meta
