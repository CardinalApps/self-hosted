import type { Meta, StoryObj } from '@storybook/react'

import Code from './Code'

const meta = {
  title: 'Typography/Code',
  component: Code,
  argTypes: {
    children: { control: 'text', table: { category: 'Content' } },
  },
} satisfies Meta<typeof Code>
type Story = StoryObj<typeof meta>

export const Inline: Story = {
  args: {
    children: 'CARDINAL_MEDIA_PORT=8080',
  },
}

export const Block: Story = {
  args: {
    children: `const streamTrack = async (trackId: string) => {
  const url = await api.getStreamUrl(trackId)
  audioPlayer.load(url)
  audioPlayer.play()
}`,
  },
}

export const InContext: Story = {
  render: () => (
    <p style={{ maxWidth: 500 }}>
      To configure the server port, set the <Code>CARDINAL_MEDIA_PORT</Code> environment variable
      before starting the server. The default value is <Code>8080</Code>.
    </p>
  ),
  parameters: {
    controls: { disable: true },
  },
}

export default meta
