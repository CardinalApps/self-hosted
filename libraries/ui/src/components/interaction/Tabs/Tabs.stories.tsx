import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import Tabs from './Tabs'

const meta = {
  title: 'Interaction/Tabs',
  component: Tabs,
  argTypes: {
    initialTab: {
      control: { type: 'number' },
      table: { category: 'Behavior' },
    },
  },
} satisfies Meta<typeof Tabs>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    labels: ['Overview', 'Tracks', 'Credits'],
  },
}

export const WithAnInitialTab: Story = {
  args: {
    labels: ['Overview', 'Tracks', 'Credits'],
    initialTab: 1,
  },
}

export const WithContent = () => {
  const [activeTab, setActiveTab] = useState(0)

  const content = [
    <div key="overview" style={{ padding: '16px 0' }}>
      <p><strong>Kind of Blue</strong> is a studio album by American jazz musician Miles Davis. It was recorded on March 2 and April 22, 1959.</p>
      <p>The album is widely considered one of the greatest and most influential jazz records ever made.</p>
    </div>,
    <div key="tracks" style={{ padding: '16px 0' }}>
      <ol style={{ paddingLeft: 20 }}>
        <li>So What — 9:22</li>
        <li>Freddie Freeloader — 9:46</li>
        <li>Blue in Green — 5:37</li>
        <li>All Blues — 11:33</li>
        <li>Flamenco Sketches — 9:26</li>
      </ol>
    </div>,
    <div key="credits" style={{ padding: '16px 0' }}>
      <p><strong>Miles Davis</strong> — trumpet</p>
      <p><strong>John Coltrane</strong> — tenor saxophone</p>
      <p><strong>Bill Evans</strong> — piano</p>
      <p><strong>Paul Chambers</strong> — bass</p>
      <p><strong>Jimmy Cobb</strong> — drums</p>
    </div>,
  ]

  return (
    <div style={{ maxWidth: 500 }}>
      <Tabs
        labels={['Overview', 'Tracks', 'Credits']}
        initialTab={activeTab}
        onChange={(i) => setActiveTab(i)}
      />
      {content[activeTab]}
    </div>
  )
}

export const ManyTabs: Story = {
  args: {
    labels: ['General', 'Audio', 'Video', 'Network', 'Storage', 'Security', 'Advanced'],
  },
}

export default meta
