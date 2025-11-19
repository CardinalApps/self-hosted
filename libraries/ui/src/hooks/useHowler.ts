import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Howl } from 'howler'

import { musicSelectors, musicActions, Player } from '../store/slices/music'
import { PLAYBACK_STATE } from '../store/slices/music/constants'
import { authorizedFetchHeaders, JWT_TYPE } from '../lib/auth/jwt'

import { HOME_SERVER_HOST } from '../../env'
import homeServerAPI from '../lib/homeserver/homeServerAPI'

const howls = {}
const streamUrl = (id) => `${HOME_SERVER_HOST}/api/v1/music/stream/${id}`

export const getHowl = (playerId) => howls?.[playerId]
export const hasHowl = (playerId) => !!howls?.[playerId]

/**
 * This custom hook is a connector between Redux, where the current playback
 * state is stored, and Howler, which drives audio playback in the browser.
 * 
 * This hook supports playback of simultaneous audio streams. Each audio stream
 * gets one AudioPlayer in the UI. In this code, "player" refers to these
 * AudioPlayers in the UI.
 * 
 * A single instance of this hook should be placed anywhere in the component
 * tree, and should not be unmounted.
 */
export default function useHowler() {
  const dispatch = useDispatch()
  const players = useSelector(musicSelectors.players)
  const playerIds = useSelector(musicSelectors.playerIds)
  const playing = useSelector(musicSelectors.playing)
  const playingIds = useSelector(musicSelectors.playingIds)
  const paused = useSelector(musicSelectors.paused)
  const pausedIds = useSelector(musicSelectors.pausedIds)
  //const settings = useSelector(settingsSelectors.current)
  //const { defaultValue: defaultMaxConcurrentAudioStreams } = useMemo(() => getSetting('max_concurrent_audio_streams')(), [])
  //const maxConcurrentAudioStreams = Number(settings.max_concurrent_audio_streams || defaultMaxConcurrentAudioStreams)

  /**
   * Creates a new Howl instance for a player. Includes callbacks for
   * synchronizing the playback with Redux.
   */
  const createHowl = (playerId) => {
    const player = Object.values(players).find((player) => player.id === playerId)

    const howl = new Howl({
      src: [streamUrl(player.trackId)],
      format: ['mp3'],
      preload: true,
      buffer: true,
      autoplay: player.state === PLAYBACK_STATE.PLAYING,
      xhr: {
        method: 'GET',
        headers: authorizedFetchHeaders(JWT_TYPE.HOME_SERVER_USER),
      },
    })

    const saveMusicHistory = (progress?: number) => {
      if (!progress) {
        const cachedSeek = sessionStorage.getItem(`audio-player-${playerId}-seek`)
        if (cachedSeek) {
          progress = Number(cachedSeek) / (howl.duration())
        }
        sessionStorage.removeItem(`audio-player-${playerId}-seek`)
      }
      homeServerAPI('/music/history', 'POST', {
        body: {
          trackId: player.trackId,
          progress: progress || 0,
        },
      })
    }

    howl.on('load', () => {
      // Howl may be destroyed before load is complete
      if (howl) {
        howl.seek(player.currentSeconds)
        dispatch(musicActions.loaded({ playerId: player.id }))
      }
    })

    howl.on('end', () => {
      saveMusicHistory(1)
      dispatch(musicActions.stop(player.id))
    })

    howl.on('stop', () => {
      saveMusicHistory()
    })

    return howl
  }

  /**
   * Create and destroy Howls when players change. A new player is created when
   * the user starts a new audio stream, and players are destroyed when playback ends.
   */
  useEffect(() => {
    // Look for new players and create Howls we don't have
    Object.values(players).forEach((player) => {
      if (!hasHowl(player.id)) {
        howls[player.id] = createHowl(player.id)
      }
    })

    // Look for stale Howl instances and destroy them
    Object.keys(howls).forEach((howlPlayerId) => {
      if (!Object.values(players).find((player) => player.id === howlPlayerId)) {
        howls[howlPlayerId].unload()
        delete howls[howlPlayerId]
      }
    })
  }, [playerIds])

  /**
   * When there is a change in the currently playing tracks.
   */
  useEffect(() => {
    playing.forEach((player: Player) => {
      const howl = getHowl(player.id)
      if (!howl.playing()) {
        howl.play()
      }
    })
  }, [playingIds])

  /**
   * When there is a change in the currently paused tracks.
   */
  useEffect(() => {
    paused.forEach((player: Player) => {
      const howl = getHowl(player.id)
      if (howl?.playing()) {
        howl.pause()
      }
    })
  }, [pausedIds])

  /**
   * Stop Howls in real time when the user lowers the max number of concurrent
   * streams.
   * 
   * TODO
   */
  // useEffect(() => {
  //   console.log('max concurrent streams', maxConcurrentAudioStreams)
  // }, [maxConcurrentAudioStreams])
}
