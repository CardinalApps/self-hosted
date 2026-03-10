import type { Meta, StoryObj } from '@storybook/react'

import H3 from '../../typography/H3'
import H6 from '../../typography/H6'
import Button from '../../interaction/Button'
import Select from '../../forms/Select'

import Card from './Card'
import { CSSProperties } from 'react'

const meta = {
  title: 'Layout/Card',
  component: Card,
  argTypes: {},
} satisfies Meta<typeof Card>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    style: {
      width: 400,
      height: 400,
    },
    mobileBg: 4,
    children: 'Card content (has different mobile background)',
  },
}

export const Overflowing: Story = {
  args: {
    style: {
      maxWidth: 400,
      height: 400,
    },
    children: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus. Vivamus pellentesque, est vel rhoncus imperdiet, urna augue porttitor dolor, eu dignissim orci augue non tellus. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Duis fringilla mauris sapien, sit amet efficitur ante efficitur in. Sed quis laoreet ligula. Vestibulum malesuada leo sit amet metus mattis cursus. Duis ultrices ac lectus sit amet placerat. Aenean quis enim condimentum, aliquet lorem eget, dictum mi. Morbi varius efficitur massa, sed consequat ipsum maximus vitae. Praesent scelerisque eros dignissim tristique porttitor. Praesent sit amet facilisis ante. Aenean viverra urna justo, in congue mi pulvinar a. Vivamus sit amet quam vel ex semper fermentum eget vel eros.

Integer maximus ante at porttitor molestie. Pellentesque cursus orci a dolor suscipit ullamcorper. Nam ac nunc et libero lobortis tempus a vel tortor. Pellentesque ac consectetur ipsum. Morbi porta tincidunt metus id lacinia. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec eget rhoncus ex. Quisque id risus sit amet lacus molestie sollicitudin. Interdum et malesuada fames ac ante ipsum primis in faucibus. Nullam id vehicula risus, efficitur placerat arcu.

Sed tincidunt dui eget ante pellentesque, vitae suscipit neque fermentum. Mauris ultricies leo condimentum facilisis pellentesque. Maecenas auctor eget ex et ultricies. Vivamus mauris odio, dapibus sit amet tempor in, sagittis nec mi. Pellentesque ut ex et mi dictum vehicula ut sed nisl. Cras pretium mollis justo in congue. Praesent placerat mi vitae aliquet gravida. Sed ut tortor lectus. Aliquam ac libero turpis. Duis non fringilla ante, nec porta risus. Mauris pharetra leo magna, vel lobortis tellus imperdiet in. Sed sit amet ligula sed elit lobortis semper.`,
  },
}

export const AllDressed: Story = {
  args: {
    padding: 'thick',
    header: <H3>What A Cool Header</H3>,
    footer:
      <>
        <Button textual={true}>Back</Button>
        <Button textual={true}>Continue</Button>
      </>,
    children: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus. Vivamus pellentesque, est vel rhoncus imperdiet, urna augue porttitor dolor, eu dignissim orci augue non tellus. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Duis fringilla mauris sapien, sit amet efficitur ante efficitur in. Sed quis laoreet ligula. Vestibulum malesuada leo sit amet metus mattis cursus. Duis ultrices ac lectus sit amet placerat. Aenean quis enim condimentum, aliquet lorem eget, dictum mi. Morbi varius efficitur massa, sed consequat ipsum maximus vitae. Praesent scelerisque eros dignissim tristique porttitor. Praesent sit amet facilisis ante. Aenean viverra urna justo, in congue mi pulvinar a. Vivamus sit amet quam vel ex semper fermentum eget vel eros.

    Integer maximus ante at porttitor molestie. Pellentesque cursus orci a dolor suscipit ullamcorper. Nam ac nunc et libero lobortis tempus a vel tortor. Pellentesque ac consectetur ipsum. Morbi porta tincidunt metus id lacinia. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec eget rhoncus ex. Quisque id risus sit amet lacus molestie sollicitudin. Interdum et malesuada fames ac ante ipsum primis in faucibus. Nullam id vehicula risus, efficitur placerat arcu.
    `,
  },
}

export const Thick: Story = {
  args: {
    style: {
      width: 400,
      height: 300,
    },
    padding: 'thick',
    children: 'Card content',
  },
}

export const Thin: Story = {
  args: {
    style: {
      width: 250,
      height: 300,
    },
    padding: 'thin',
    children: 'Card content',
  },
}

export const NoPadding: Story = {
  args: {
    style: {
      width: 400,
    },
    padding: 'none',
    children: 'There is no padding',
  },
}

export const Image: Story = {
  args: {
    style: {
      width: 400,
      height: 400,
      backgroundImage: 'url("images/1.jpg")',
    },
    padding: 'none',
  },
}

export const Header = () => {
  return (
    <Card
      style={{
        width: 280,
      }}
      header={<><H6>Example header</H6></>}
    >
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus.
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus.
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus.
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus.
    </Card>
  )
}

export const Footer = () => {
  return (
    <Card
      style={{
        width: 300,
      }}
      footer={
        <>
          <Button textual={true}>Confirm</Button>
          <Button textual={true}>Cancel</Button>
        </>
      }
    >
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus.
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus.
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus.
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus.
    </Card>
  )
}

export const Nested = () => {
  return (
    <Card
      style={{
        maxWidth: 600,
      }}
      bg={1}
      shadow={1}
      border={1}
      padding={'none'}
    >
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus.
      <Card style={{ margin: 20 }} bg={3} shadow={3} border={3} padding={'thick'}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus.
        <Card style={{ height: 200, margin: 20 }} bg={2} shadow={2} border={0} padding={'none'}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique elementum metus.
        </Card>
      </Card>
    </Card>
  )
}

export const Swatches = () => {
  const parentStyle: CSSProperties = {
    marginBottom: 25,
    display: 'flex',
    flexWrap: 'wrap',
    background: 'var(--backgound-color-base)',
  }
  const titleStyle = {
    marginLeft: 10,
  }
  const cardStyle = {
    width: 300,
    height: 300,
    margin: 10,
  }
  const pStyle = {
    marginBottom: 15,
    fontWeight: 500,
  }
  const handleBgChange = (val: string) => {
    document.querySelector('.app')?.setAttribute('style', `background: var(${val});`)
  }
  return (
    <div>
      <Select
        style={{ width: 200, margin: '0 0 20px 10px' }}
        multi={false}
        options={[
          {
            label: 'bg-1',
            value: '--bg-1',
          },
          {
            label: 'bg-2',
            value: '--bg-2',
          },
          {
            label: 'bg-3',
            value: '--bg-3',
          },
          {
            label: 'bg-4',
            value: '--bg-4',
          },
        ]}
        onChange={(val: string) => handleBgChange(val)}
      />
      <div style={{ ...titleStyle, marginBottom: 20 }}>
        <p>Apps use bg-2 for the viewport background.</p>
      </div>
      <h3 style={titleStyle}>Text & Background Colors</h3>
      <div style={parentStyle}>
        <Card
          bg={1}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-1</p>
          <p style={{ ...pStyle, color: 'var(--text-color-1)' }}><strong>[text-color-1]</strong> Lorem ipsum dolor sit amet consectetur.</p>
          <p style={{ ...pStyle, color: 'var(--text-color-2)' }}><strong>[text-color-2]</strong> Lorem ipsum dolor sit amet consectetur.</p>
          <p style={{ ...pStyle, color: 'var(--text-color-3)' }}><strong>[text-color-3]</strong> Lorem ipsum dolor sit amet consectetur.</p>
        </Card>
        <Card
          bg={2}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-2</p>
          <p style={{ ...pStyle, color: 'var(--text-color-1)' }}><strong>[text-color-1]</strong> Lorem ipsum dolor sit amet consectetur.</p>
          <p style={{ ...pStyle, color: 'var(--text-color-2)' }}><strong>[text-color-2]</strong> Lorem ipsum dolor sit amet consectetur.</p>
          <p style={{ ...pStyle, color: 'var(--text-color-3)' }}><strong>[text-color-3]</strong> Lorem ipsum dolor sit amet consectetur.</p>
        </Card>
        <Card
          bg={3}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-3</p>
          <p style={{ ...pStyle, color: 'var(--text-color-1)' }}><strong>[text-color-1]</strong> Lorem ipsum dolor sit amet consectetur.</p>
          <p style={{ ...pStyle, color: 'var(--text-color-2)' }}><strong>[text-color-2]</strong> Lorem ipsum dolor sit amet consectetur.</p>
          <p style={{ ...pStyle, color: 'var(--text-color-3)' }}><strong>[text-color-3]</strong> Lorem ipsum dolor sit amet consectetur.</p>
        </Card>
        <Card
          bg={4}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-4</p>
          <p style={{ ...pStyle, color: 'var(--text-color-1)' }}><strong>[text-color-1]</strong> Lorem ipsum dolor sit amet consectetur.</p>
          <p style={{ ...pStyle, color: 'var(--text-color-2)' }}><strong>[text-color-2]</strong> Lorem ipsum dolor sit amet consectetur.</p>
          <p style={{ ...pStyle, color: 'var(--text-color-3)' }}><strong>[text-color-3]</strong> Lorem ipsum dolor sit amet consectetur.</p>
        </Card>
      </div>

      <h3 style={titleStyle}>Shadows</h3>
      <div style={parentStyle}>
        <Card
          bg={1}
          shadow={1}
          border={0}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-1</p>
          <p style={{ ...pStyle }}>box-shadow-1</p>
        </Card>
        <Card
          bg={1}
          shadow={2}
          border={0}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-1</p>
          <p style={{ ...pStyle }}>box-shadow-2</p>
        </Card>
        <Card
          bg={1}
          shadow={3}
          border={0}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-1</p>
          <p style={{ ...pStyle }}>box-shadow-3</p>
        </Card>
        <Card
          bg={1}
          shadow={4}
          border={0}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-1</p>
          <p style={{ ...pStyle }}>box-shadow-4</p>
        </Card>
      </div>

      <h3 style={titleStyle}>Borders</h3>
      <div style={parentStyle}>
        <Card
          bg={1}
          border={1}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-1</p>
          <p style={{ ...pStyle }}>border-color-1</p>
        </Card>
        <Card
          bg={1}
          border={2}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-1</p>
          <p style={{ ...pStyle }}>border-color-2</p>
        </Card>
        <Card
          bg={1}
          border={3}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-1</p>
          <p style={{ ...pStyle }}>border-color-3</p>
        </Card>
        <Card
          bg={2}
          border={1}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-2</p>
          <p style={{ ...pStyle }}>border-color-1</p>
        </Card>
        <Card
          bg={2}
          border={2}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-2</p>
          <p style={{ ...pStyle }}>border-color-2</p>
        </Card>
        <Card
          bg={2}
          border={3}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-2</p>
          <p style={{ ...pStyle }}>border-color-3</p>
        </Card>
        <Card
          bg={3}
          border={1}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-3</p>
          <p style={{ ...pStyle }}>border-color-1</p>
        </Card>
        <Card
          bg={3}
          border={2}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-3</p>
          <p style={{ ...pStyle }}>border-color-2</p>
        </Card>
        <Card
          bg={3}
          border={3}
          style={cardStyle}
        >
          <p style={{ ...pStyle }}>bg-3</p>
          <p style={{ ...pStyle }}>border-color-3</p>
        </Card>
      </div>
    </div>
  )
}

export default meta
