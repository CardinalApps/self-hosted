import { DynamicQueueType } from '../playback-queue/dtos/CreatePlaybackQueue'

export type MusicSpotlightReasonKind =
  | 'heavy_rotation'
  | 'favorited_track'
  | 'rediscover'
  | 'unplayed'
  | 'library_pick'

/**
 * Why the artist or release was picked. Clients render the sentence themselves
 * from the kind and its params, so the reason stays translatable.
 */
export type MusicSpotlightReason = {
  kind: MusicSpotlightReasonKind

  // The title of the recently favorited track, only for `favorited_track`
  trackTitle?: string

  // When the artist or release was last played, only for `rediscover`
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

export type MusicReleaseSpotlight = {
  musicReleaseId: string
  title: string
  reason: MusicSpotlightReason

  // The release's primary artist, null when the release has none
  artistName: string | null
  musicArtistId: string | null

  // The dynamic queue type that best fits the reason the release was picked
  queueType: DynamicQueueType
}

export type GetMusicReleaseSpotlightResponse = {
  spotlight: MusicReleaseSpotlight | null
}
