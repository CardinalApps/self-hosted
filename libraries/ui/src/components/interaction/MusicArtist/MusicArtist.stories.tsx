import type { Meta } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'

import MusicArtist from './MusicArtist'

import useHowler from '../../../hooks/useHowler'

const meta = {
  title: 'Interaction/MusicArtist',
  component: MusicArtist,
  argTypes: {},
} satisfies Meta<typeof MusicArtist>

export const Default = () => {
  useHowler()

  return (
    <MemoryRouter>
      <MusicArtist
        name="Archspire"
        link="/artists/archspire"
        image="/sample/archspire.jpg"
        numReleases={4}
        numTracks={36}
      />
    </MemoryRouter>
  )
}

export const Empty = () => {
  useHowler()

  return (
    <MemoryRouter>
      <MusicArtist
        name="Archspire"
        link="/artists/archspire"
        numReleases={4}
        numTracks={36}
      />
    </MemoryRouter>
  )
}

export const Empty = () => {
  useHowler()

  return (
    <MemoryRouter>
      <MusicArtist
        name="Archspire"
        link="/artists/archspire"
        numReleases={4}
        numTracks={36}
      />
    </MemoryRouter>
  )
}

export default meta
