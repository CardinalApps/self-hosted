import type { Meta } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'

import MusicRelease from './MusicRelease'

import useHowler from '../../../hooks/useHowler'
import { MusicTrackType } from '../../../store/apis/musicTracks'

const meta = {
  title: 'Interaction/MusicRelease',
  component: MusicRelease,
  argTypes: {},
} satisfies Meta<typeof MusicRelease>

export const Default = () => {
  useHowler()

  return (
    <MemoryRouter>
      <MusicRelease
        tracks={[{ id: 1, trackNumber: 1 } as MusicTrackType]}
        overrideArtwork="/sample/cover.jpg"
        releaseTitle="The Perils of Time Travel"
        artistName="Thank You Scientist"
        releaseYear="2011"
        releaseLink="/"
        artistLink="#"
      />
    </MemoryRouter>
  )
}

export default meta
