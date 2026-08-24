import type { Meta } from '@storybook/react'

import MusicReleaseGhost from './MusicReleaseGhost'

const meta = {
  title: 'Interaction/MusicReleaseGhost',
  component: MusicReleaseGhost,
  argTypes: {},
} satisfies Meta<typeof MusicReleaseGhost>

export const Default = () => <MusicReleaseGhost />

export const CustomTitle = () => (
  <MusicReleaseGhost releaseTitle="Nothing here yet" coverSize={{ width: 220, height: 220 }} />
)

export default meta
