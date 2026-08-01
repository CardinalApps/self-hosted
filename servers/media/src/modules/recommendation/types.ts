import { DynamicQueueType } from '../playback-queue/dtos/CreatePlaybackQueue'

export type MusicSpotlightReasonKind =
  | 'heavy_rotation'
  | 'favorited_track'
  | 'rediscover'
  | 'unplayed'
  | 'library_pick'

/**
 * Why the artist was picked. Clients render the sentence themselves from the
 * kind and its params, so the reason stays translatable.
 */
export type MusicSpotlightReason = {
  kind: MusicSpotlightReasonKind

  // The title of the recently favorited track, only for `favorited_track`
  trackTitle?: string

  // When the artist was last played, only for `rediscover`
  lastPlayedAt?: string
}

export type MusicArtistSpotlight = {
  musicArtistId: string
  name: string
  reason: MusicSpotlightReason

  // The dynamic queue type that best fits the reason the artist was picked
  queueType: DynamicQueueType
}

export type GetMusicArtistSpotlightResponse = {
  spotlight: MusicArtistSpotlight | null
}
