import { useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import Visualizer from './Visualizer'
import { VISUALIZER_VARIANTS } from './variants'

/* The component takes a live media element, so the story has to supply one. A local file played
   through an <audio> element is the same arrangement the playback sidebar hands it. */
const Demo = ({ variant }: { variant: typeof VISUALIZER_VARIANTS[number] }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [element, setElement] = useState<HTMLAudioElement | null>(null)
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('Load an audio file to drive the analysis')

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const audio = audioRef.current
    if (!file || !audio) {
      return
    }
    audio.src = URL.createObjectURL(file)
    audio.loop = true
    await audio.play()
    setElement(audio)
    setName(file.name)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 340, aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden' }}>
        <Visualizer
          key={variant}
          variant={variant}
          mediaElement={element}
          onReady={() => setReady(true)}
        />
      </div>
      <audio ref={audioRef} />
      <label style={buttonStyle}>
        Load audio file
        <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={onFile} />
      </label>
      <span style={{ fontSize: 13, opacity: 0.7 }}>{name}</span>
      <span style={{ fontSize: 13, opacity: 0.7 }}>{ready ? 'onReady fired' : 'warming up…'}</span>
    </div>
  )
}

const buttonStyle: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid rgba(128, 128, 160, 0.35)',
  background: 'rgba(128, 128, 160, 0.12)',
  color: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
}

const meta = {
  title: 'Graphics/Visualizer',
  component: Demo,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'select', options: VISUALIZER_VARIANTS },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 16, background: '#0a0b10', color: '#e8e8f0' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Demo>

type Story = StoryObj<typeof meta>

export const Variants: Story = {
  args: {
    variant: 'radial-wave',
  },
}

export default meta
