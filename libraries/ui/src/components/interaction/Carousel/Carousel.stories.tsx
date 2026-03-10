import type { Meta } from '@storybook/react'

import Carousel from './Carousel'

const meta = {
  title: 'Interaction/Carousel',
  component: Carousel,
  argTypes: {},
} satisfies Meta<typeof Carousel>

export const Default = () => {
  return (
    <Carousel
      width={400}
      initialSlide={1}
      title="My cool carousel"
      next={true}
      prev={true}
      items={[
        <img src="/sample/images/original/birb.jpg" style={{ width: 400 }} />,
        <img src="/sample/images/original/book.jpg" style={{ width: 400 }} />,
        <img src="/sample/images/original/face.jpg" style={{ width: 400 }} />,
        <img src="/sample/images/original/car.jpg" style={{ width: 400 }} />,
      ]}
    />
  )
}

export default meta
