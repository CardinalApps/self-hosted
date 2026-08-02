import type { Meta } from '@storybook/react'

import MusicTrackGhost from './MusicTrackGhost'

const meta = {
  title: 'Interaction/MusicTrackGhost',
  component: MusicTrackGhost,
  argTypes: {},
} satisfies Meta<typeof MusicTrackGhost>

export const Default = () => <MusicTrackGhost />

export const CustomLabel = () => <MusicTrackGhost label="Nothing here yet" />

export default meta
