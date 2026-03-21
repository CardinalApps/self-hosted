import type { Meta } from '@storybook/react'

import Button from '../../interaction/Button'

import { audioSelectors } from '../../../store/slices/music'
import play from '../../../store/slices/music/thunks/play'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { useAppSelector } from '../../../hooks/useAppSelector'

import AudioPlayer from './AudioPlayer'

import useHowler from '../../../hooks/useHowler'

const samepleTrackId = '123'

const meta = {
  title: 'Feature/AudioPlayer',
  component: AudioPlayer,
  argTypes: {},
} satisfies Meta<typeof AudioPlayer>

export const MiniPlayer = () => {
  useHowler()
  const dispatch = useAppDispatch()
  const players = useAppSelector(audioSelectors.players)
  const player = Object.values(players).find((player) => player.trackId === samepleTrackId)

  return (
    <>
      <div style={{ padding: '10px 0' }}>
        <p>Hardcoded to use track ID 1. Use the Music page in the sandbox app for more advanced testing.</p>
        <p><Button onClick={() => dispatch(play({ trackIds: [samepleTrackId] }))}>Play track 1</Button></p>
      </div>
      {!!player &&
        <AudioPlayer
          playerId={player.id}
          size="mini"
        />
      }
    </>
  )
}

export default meta
