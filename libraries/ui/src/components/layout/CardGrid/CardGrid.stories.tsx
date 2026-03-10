import type { Meta, StoryObj } from '@storybook/react'

import H3 from '../../typography/H3'
import Button from '../../interaction/Button'

import CardGrid from './CardGrid'
import Card from '../Card'

const meta = {
  title: 'Layout/CardGrid',
  component: CardGrid,
  argTypes: {},
} satisfies Meta<typeof CardGrid>
type Story = StoryObj<typeof meta>

export const Flex: Story = {
  args: {
    layout: "flex",
    title: "Flex layout allows card to exist between a min and max width",
    children: (
      <>
        <Card header={<H3>Title</H3>}>Just a little content.</Card>
        <Card header={<H3>Title</H3>} footer={<Button>Button</Button>}>Just a little content. Just a little content. Just a little content. Just a little content. Just a little content. Just a little content. Just a little content. Just a little content. Just a little content. Just a little content.</Card>
        <Card header={<H3>Title</H3>}>Just a little content.</Card>
      </>
    ),
  },
}

export const Grid: Story = {
  args: {
    layout: "grid",
    title: "Grid layout",
    children: (
      <>
        <Card header={<H3>Title</H3>}>Just a little content.</Card>
        <Card header={<H3>Title</H3>} footer={<Button>Button</Button>}>Just a little content. Just a little content. Just a little content. Just a little content. Just a little content. Just a little content. Just a little content. Just a little content. Just a little content. Just a little content.</Card>
        <Card header={<H3>Title</H3>}>Just a little content.</Card>
      </>
    ),
  },
}



export default meta
