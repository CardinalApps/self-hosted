import { useEffect, useMemo } from 'react'
import { Howl } from 'howler'
import { useAppDispatch } from '../useAppDispatch'
import { useAppSelector } from '../useAppSelector'

import { getSetting } from '@cardinalapps/app-settings/src'
import { SupportedLang } from '@cardinalapps/app-settings/src/types'
import { audioSelectors, audioActions, Player } from '../../store/slices/music'
import { CACHED_SEEK_SESSION_STORAGE_KEY, PLAYBACK_STATE } from '../../store/slices/music/constants'
import { authorizedFetchHeaders, JWT_TYPE } from '../../lib/auth/jwt'
import { settingsSelectors } from '../../store/slices/settings'
import { useUpsertHistoryEntryMutation } from '../../store/apis/musicHistory'
import next from '../../store/slices/music/thunks/next'

import { HOME_SERVER_HOST } from '../../../env'
import { toastActions } from '../../store/slices/toast'

import i18n from './i18n'

const howls = {}
const streamUrl = (id) => `${HOME_SERVER_HOST}/api/v1/music/stream/${id}?transcode&bitrate=320`

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
  const dispatch = useAppDispatch()
  const players = useAppSelector(audioSelectors.players)
  const playerIds = useAppSelector(audioSelectors.playerIds)
  const loading = useAppSelector(audioSelectors.loading)
  const loadingIds = useAppSelector(audioSelectors.loadingIds)
  const playing = useAppSelector(audioSelectors.playing)
  const playingIds = useAppSelector(audioSelectors.playingIds)
  const paused = useAppSelector(audioSelectors.paused)
  const pausedIds = useAppSelector(audioSelectors.pausedIds)
  const {
    lang,
    max_concurrent_audio_streams,
    audio_playback_timeout,
  } = useAppSelector(settingsSelectors.current)

  const {
    defaultValue: defaultMaxConcurrentAudioStreams,
  } = useMemo(() => getSetting('max_concurrent_audio_streams')('music', lang as SupportedLang), [])
  const maxConcurrentAudioStreams = Number(max_concurrent_audio_streams || defaultMaxConcurrentAudioStreams)

  const [upsertHistory] = useUpsertHistoryEntryMutation()

  /**
   * Creates a new Howl instance for a player. Includes callbacks for
   * synchronizing the playback with Redux.
   */
  const createHowl = (playerId) => {
    const player = Object.values(players).find((player) => player.id === playerId)

    // FIXME the onerror cb fires every time, I think because there is no public
    // URL for the audio file?
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

    /**
     * Send playback history to the media server.
     */
    const saveMusicHistory = (playerId, trackId, queueItemId) => {
      let seconds = 0
      try {
        const cachedSeek = JSON.parse(sessionStorage.getItem(CACHED_SEEK_SESSION_STORAGE_KEY))
        if (cachedSeek[playerId]) {
          seconds = cachedSeek[playerId]
          delete cachedSeek[playerId]
        }
        sessionStorage.setItem(CACHED_SEEK_SESSION_STORAGE_KEY, JSON.stringify(cachedSeek))
      } catch (error) {
        console.error(error)
      }
      upsertHistory({
        trackId,
        queueItemId,
        seconds,
      })
    }

    const timeout: ReturnType<typeof setTimeout> = setTimeout(() => {
      howl.unload()
      // Provide fromTrackId in case the user has manually clicked "next" while this is loading
      dispatch(next({ playerId, fromTrackId: player.trackId }))
      dispatch(toastActions.addToQueue({
        title: i18n['howler.playback-timeout'][lang],
        ttl: 5000,
        type: 'danger',
      }))
    }, audio_playback_timeout as number)

    howl.on('load', () => {
      clearTimeout(timeout)
      // Howl may be destroyed before load is complete
      if (howl) {
        saveMusicHistory(player.id, player.trackId, player?.currentQueueItem?.queueItemId)
        howl.seek(player.currentSeconds)
        dispatch(audioActions.loaded({ playerId: player.id, maxConcurrentPlayingPlayers: maxConcurrentAudioStreams }))
      }
    })

    howl.on('end', () => {
      saveMusicHistory(player.id, player.trackId, player?.currentQueueItem?.queueItemId)
      dispatch(next({ playerId: player.id }))
    })

    howl.on('stop', () => {
      saveMusicHistory(player.id, player.trackId, player?.currentQueueItem?.queueItemId)
    })

    return howl
  }

  /**
   * Reinitialize all howls on app init.
   */
  useEffect(() => {
    // Look for new players and create Howls we don't have
    Object.values(players).forEach((player) => {
      if (!hasHowl(player.id)) {
        howls[player.id] = createHowl(player.id)
      }
    })
  }, [])

  /**
   * When there is a change in Player IDs.
   */
  useEffect(() => {
    // Look for stale Howl instances and destroy them
    Object.keys(howls).forEach((howlPlayerId) => {
      if (!Object.values(players).find((player) => player.id === howlPlayerId)) {
        howls[howlPlayerId].unload()
        delete howls[howlPlayerId]
      }
    })
  }, [playerIds])

  /**
   * When there is a change in the currently loading tracks.
   * 
   * Create howls for the tracks, and overwrite the current howl if necessary.
   */
  useEffect(() => {
    loading.forEach((player: Player) => {
      const howl = getHowl(player.id)
      if (howl) {
        howl.unload()
        delete howls[player.id]
      }
      howls[player.id] = createHowl(player.id)
    })
  }, [loadingIds])

  /**
   * When there is a change in the currently playing tracks.
   * 
   * Propagate the playing state to the howls.
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
   * 
   * Propagate the paused state to the howls.
   */
  useEffect(() => {
    paused.forEach((player: Player) => {
      const howl = getHowl(player.id)
      if (howl?.playing()) {
        howl.pause()
      }
    })
  }, [pausedIds])
}
