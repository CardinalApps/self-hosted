import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import Popout from './Popout'
import type { PopoutAnchor } from './Popout'

const DemoTrigger = ({ open, onToggle }: { open: boolean, onToggle: () => void }) => (
  <button
    onClick={onToggle}
    style={{
      width: 40,
      height: 40,
      borderRadius: '100%',
      border: '1px solid var(--border-color-1)',
      background: open ? 'var(--bg-3)' : 'var(--bg-1)',
      cursor: 'pointer',
    }}
  >
    ☰
  </button>
)

const Combo = ({ position, origin }: { position: PopoutAnchor, origin: PopoutAnchor }) => {
  const [open, setOpen] = useState(true)
  return (
    <Popout
      open={open}
      onClose={() => setOpen(false)}
      position={position}
      origin={origin}
      offset={8}
      width={160}
      trigger={<DemoTrigger open={open} onToggle={() => setOpen((o) => !o)} />}
    >
      <div style={{ padding: 12, fontSize: 12 }}>
        position=&quot;{position}&quot;<br />origin=&quot;{origin}&quot;
      </div>
    </Popout>
  )
}

const meta = {
  title: 'Layout/Popout',
  component: Popout,
  args: {
    open: false,
    trigger: null,
  },
  argTypes: {
    position: {
      control: { type: 'select' },
      options: ['tl', 'tc', 'tr', 'ml', 'mm', 'mr', 'bl', 'bm', 'br'],
    },
    origin: {
      control: { type: 'select' },
      options: ['tl', 'tc', 'tr', 'ml', 'mm', 'mr', 'bl', 'bm', 'br'],
    },
    offset: { control: { type: 'number' } },
    width: { control: { type: 'number' } },
    title: { control: 'text' },
  },
} satisfies Meta<typeof Popout>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    position: 'tl',
    origin: 'bl',
    offset: 10,
    width: 220,
    title: 'Popout title',
  },
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <div style={{ padding: 100 }}>
        <Popout
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          trigger={<DemoTrigger open={open} onToggle={() => setOpen((o) => !o)} />}
        >
          <div style={{ padding: 20 }}>Popout content goes here.</div>
        </Popout>
      </div>
    )
  },
}

export const AllPositions: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => {
    const combos: { position: PopoutAnchor, origin: PopoutAnchor }[] = [
      { position: 'tl', origin: 'bl' },
      { position: 'tc', origin: 'bm' },
      { position: 'tr', origin: 'br' },
      { position: 'bl', origin: 'tl' },
      { position: 'bm', origin: 'tc' },
      { position: 'br', origin: 'tr' },
      { position: 'tr', origin: 'ml' },
      { position: 'tl', origin: 'mr' },
      { position: 'mm', origin: 'mm' },
    ]
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 260, padding: 200 }}>
        {combos.map(({ position, origin }) => (
          <Combo key={`${position}-${origin}`} position={position} origin={origin} />
        ))}
      </div>
    )
  },
}

export default meta
