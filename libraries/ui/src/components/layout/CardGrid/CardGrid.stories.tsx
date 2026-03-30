import type { Meta, StoryObj } from '@storybook/react'

import H3 from '../../typography/H3'
import H6 from '../../typography/H6'
import Button from '../../interaction/Button'
import P from '../../typography/P'

import CardGrid from './CardGrid'
import Card from '../Card'

const meta = {
  title: 'Layout/CardGrid',
  component: CardGrid,
  argTypes: {
    layout: {
      control: { type: 'select' },
      options: ['flex', 'grid'],
      table: { category: 'Layout' },
    },
    title: { control: 'text', table: { category: 'Content' } },
  },
} satisfies Meta<typeof CardGrid>
type Story = StoryObj<typeof meta>

const sampleCards = (
  <>
    <Card header={<H3>Cardinal Music</H3>} footer={<Button textual>Learn more</Button>}>
      Stream your music collection. Supports FLAC, MP3, AAC, and most other audio formats.
    </Card>
    <Card header={<H3>Cardinal Photos</H3>} footer={<Button textual>Learn more</Button>}>
      Organise your photo library with albums, face recognition, and map-based browsing.
    </Card>
    <Card header={<H3>Cardinal Cinema</H3>} footer={<Button textual>Learn more</Button>}>
      Watch your films and TV shows. Supports MKV, MP4, and hardware-accelerated transcoding.
    </Card>
    <Card header={<H3>Cardinal Books</H3>} footer={<Button textual>Learn more</Button>}>
      Read your ebook library. Supports EPUB and PDF with synced reading positions.
    </Card>
  </>
)

export const Flex: Story = {
  args: {
    layout: 'flex',
    title: 'Flex layout — cards fill available space between a min and max width',
    children: sampleCards,
  },
}

export const Grid: Story = {
  args: {
    layout: 'grid',
    title: 'Grid layout — cards align to a strict column grid',
    children: sampleCards,
  },
}

export default meta
