import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'

import { audioSelectors, Player } from '../store/slices/music'

/**
 * Cardinal can run more than one audio stream at a time, but the players that show
 * one stream at a time (the mini player, the playback sidebar) have to agree on
 * which one that is. The newest player wins, and an actively playing one always
 * beats an idle one.
 */
export const useVisiblePlayer = (): [string | undefined, (playerId: string) => void] => {
  const players = useSelector(audioSelectors.players)
  const playerIds = useSelector(audioSelectors.playerIds)
  const playing = useSelector(audioSelectors.playing)
  const playingIds = useSelector(audioSelectors.playingIds)
  const [visiblePlayer, setVisiblePlayer] = useState<string | undefined>()

  /**
   * Switch to the newest player when one is added.
   */
  useEffect(() => {
    const newest = Object.values(players).sort((a, b) => a?.initializedAt >= b?.initializedAt ? -1 : 1)?.[0]
    if (newest) {
      setVisiblePlayer(newest.id)
    } else {
      setVisiblePlayer(undefined)
    }
  }, [playerIds])

  /**
   * Always show the active player. If multiple are active, show the newest one.
   */
  useEffect(() => {
    const inOrderOfNewest = playing.sort((a: Player, b: Player) => a?.currentPlaybackStartedAt >= b?.currentPlaybackStartedAt ? -1 : 1)
    const playerToShow = inOrderOfNewest?.[0] as Player
    if (playerToShow) {
      setVisiblePlayer(playerToShow.id)
    }
  }, [playingIds])

  return [visiblePlayer, setVisiblePlayer]
}

export default useVisiblePlayer
