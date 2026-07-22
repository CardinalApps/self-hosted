import { useState, useEffect, useRef } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import Scrubber from './Scrubber'
import type { MusicTrackWaveformType } from '../../../store/apis/musicTracks'

/*
  Synthesizes a song-shaped waveform payload (intro, verses, bass-heavy
  choruses, a bright bridge, outro) in the same format the media server
  stores, so the wave rendering can be developed without a server.
*/
const makeWaveformFixture = (): MusicTrackWaveformType => {
  const binCount = 1200
  const channels = { peak: [], rms: [], low: [], mid: [], high: [] } as Record<string, number[]>

  for (let i = 0; i < binCount; i++) {
    const t = i / binCount
    const inChorus = (t >= 0.25 && t < 0.5) || (t >= 0.66 && t < 0.9)
    const inBridge = t >= 0.5 && t < 0.6
    const inBreakdown = t >= 0.6 && t < 0.66

    let energy = 0.38
    if (t < 0.06) energy = (t / 0.06) * 0.25
    else if (inChorus) energy = 0.95
    else if (inBridge) energy = 0.55
    else if (inBreakdown) energy = 0.16
    else if (t >= 0.9) energy = ((1 - t) / 0.1) * 0.5

    const noise = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
    const swell = 0.85 + 0.15 * Math.sin(t * Math.PI * 14)
    const wobble = (0.72 + 0.28 * noise) * swell
    const rms = Math.max(0, Math.min(1, energy * wobble))

    const lowWeight = inChorus ? 0.68 : 0.3
    const highWeight = (inBridge || inBreakdown) ? 0.62 : 0.16 + 0.1 * noise

    channels.rms.push(Math.round(rms * 255))
    channels.peak.push(Math.min(255, Math.round(rms * 255 * 1.3)))
    channels.low.push(Math.round(rms * lowWeight * 255))
    channels.mid.push(Math.round(rms * 0.5 * 255))
    channels.high.push(Math.round(rms * highWeight * 255))
  }

  const encode = (bytes: number[]) => btoa(bytes.map((b) => String.fromCharCode(b)).join(''))

  return {
    version: 1,
    binCount,
    data: {
      channels: {
        peak: encode(channels.peak),
        rms: encode(channels.rms),
        low: encode(channels.low),
        mid: encode(channels.mid),
        high: encode(channels.high),
      },
      scales: { peak: 1, rms: 0.7, bands: 0.5 },
    },
    integratedLufs: -9.2,
    truePeakDb: -0.2,
    silenceLeadIn: 0.4,
    silenceLeadOut: 1.1,
  }
}

const waveformFixture = makeWaveformFixture()

const meta = {
  title: 'Interaction/Scrubber',
  component: Scrubber,
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      table: { category: 'Progress' },
    },
    max: {
      control: { type: 'range', min: 1, max: 1000, step: 1 },
      table: { category: 'Progress' },
    },
  },
} satisfies Meta<typeof Scrubber>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: 0,
    max: 100,
  },
  render: (args) => (
    <Scrubber
      {...args}
      onChange={(v) => console.log('onChange', v)}
      onChangeEnd={(v) => console.log('onChangeEnd', v)}
      onIsScrubbing={(v) => console.log('onIsScrubbing', v)}
    />
  ),
}

export const AutomaticProgress = () => {
  const isMoving = useRef(false)
  const [value, setValue] = useState(0)
  const max = 100

  useEffect(() => {
    const updater = setInterval(() => {
      if (!isMoving.current) {
        setValue((v) => v + 0.1 < max ? v + 0.1 : max)
      }
    }, 100)
    return () => clearInterval(updater)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Scrubber
        value={value}
        max={max}
        onChangeStart={() => { isMoving.current = true }}
        onChange={(v) => { setValue(v.value) }}
        onChangeEnd={(v) => { setValue(v.value); isMoving.current = false }}
        onIsScrubbing={() => {}}
      />
      <div style={{ fontSize: 12, opacity: 0.6 }}>
        {Math.round(value)} / {max} — Drag the handle to scrub
      </div>
    </div>
  )
}

export const Waveform = () => {
  const isMoving = useRef(false)
  const [value, setValue] = useState(30)
  const max = 100

  useEffect(() => {
    const updater = setInterval(() => {
      if (!isMoving.current) {
        setValue((v) => v + 0.05 < max ? v + 0.05 : 0)
      }
    }, 100)
    return () => clearInterval(updater)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
      <Scrubber
        waveform={waveformFixture}
        value={value}
        max={max}
        buffered={Math.min(max, value + 15)}
        onChangeStart={() => { isMoving.current = true }}
        onChange={(v) => { setValue(v.value) }}
        onChangeEnd={(v) => { setValue(v.value); isMoving.current = false }}
      />
      <Scrubber
        waveform={waveformFixture}
        tintColors={['#e91e63']}
        value={value}
        max={max}
        onChange={(v) => { setValue(v.value) }}
        onChangeEnd={(v) => { setValue(v.value) }}
      />
      <Scrubber
        waveform={waveformFixture}
        tintColors={['#00bfa5']}
        value={value}
        max={max}
        onChange={(v) => { setValue(v.value) }}
        onChangeEnd={(v) => { setValue(v.value) }}
      />
      <div style={{ fontSize: 12, opacity: 0.6 }}>
        Accent color, then two cover tints — drag anywhere to seek
      </div>
    </div>
  )
}

export const Vertical = () => {
  const [value, setValue] = useState(60)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ height: 140 }}>
        <Scrubber
          vertical
          value={value}
          max={100}
          onChange={(v) => setValue(v.value)}
          onChangeEnd={(v) => setValue(v.value)}
        />
      </div>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{Math.round(value)} / 100</div>
    </div>
  )
}

export default meta
