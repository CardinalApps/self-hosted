import type { Meta } from '@storybook/react'

import MusicPlaybackButton from './MusicPlaybackButton'

import useHowler from '../../../hooks/useHowler'

const meta = {
  title: 'Interaction/MusicPlaybackButton',
  component: MusicPlaybackButton,
  argTypes: {},
} satisfies Meta<typeof MusicPlaybackButton>

export const Play = () => {
  useHowler()

  return (
    <>
      <div style={{ padding: '10px 0' }}>
        <p>Demo does not work right now</p>
      </div>
      <MusicPlaybackButton
        musicTrackIds={['123']}
        musicTrackIdToPlay={'123'}
      />
    </>
  )
}

export default meta
