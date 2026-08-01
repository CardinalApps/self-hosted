import type { Meta } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'

import Spotlight from './Spotlight'

const meta = {
  title: 'Interaction/Spotlight',
  component: Spotlight,
  argTypes: {},
} satisfies Meta<typeof Spotlight>

export const Default = () => {
  return (
    <MemoryRouter>
      <div style={{ height: 320 }}>
        <Spotlight
          kicker="Artist Spotlight"
          title="Archspire"
          titleLink="/artists/archspire"
          reason="Because you haven't played them yet"
          image="/sample/archspire.jpg"
          imageColor="#7a4fd0"
          stats={<><span>4 releases</span><span>·</span><span>36 tracks</span></>}
        />
      </div>
    </MemoryRouter>
  )
}

export const NoImage = () => {
  return (
    <MemoryRouter>
      <div style={{ height: 320 }}>
        <Spotlight
          kicker="Artist Spotlight"
          title="Archspire"
          reason="Because you favorited Golden Mouth of Ruin"
        />
      </div>
    </MemoryRouter>
  )
}

export default meta
