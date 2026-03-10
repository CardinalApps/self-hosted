import type { Meta } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'

import MusicTrack from './MusicTrack'

import useHowler from '../../../hooks/useHowler'

const meta = {
  title: 'Interaction/MusicTrack',
  component: MusicTrack,
  argTypes: {},
} satisfies Meta<typeof MusicTrack>

export const Default = () => {
  useHowler()

  return (
    <MemoryRouter>
      <MusicTrack
        musicTrackId={'123'}
        trackNumber={1}
        trackTitle="Micro Aggressions"
        releaseTitle="Parrhesia"
        artistName="Animals as Leaders"
        duration="3:40"
        plays={20}
        artistLink="#"
        releaseLink="#"
      />
    </MemoryRouter>
  )
}

export default meta
