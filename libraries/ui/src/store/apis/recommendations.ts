import { baseHomeServerApi } from './baseHomeServerApi'
import { DynamicQueueType } from './playbackQueues'

export type MusicSpotlightReasonKindType =
  | 'heavy_rotation'
  | 'favorited_track'
  | 'rediscover'
  | 'unplayed'
  | 'library_pick'

export type MusicSpotlightReasonType = {
  kind: MusicSpotlightReasonKindType,
  /** The title of the recently favorited track, only for `favorited_track`. */
  trackTitle?: string,
  /** When the artist was last played, only for `rediscover`. */
  lastPlayedAt?: string,
}

export type MusicArtistSpotlightType = {
  musicArtistId: string,
  name: string,
  reason: MusicSpotlightReasonType,
  /** The dynamic queue type that best fits the reason the artist was picked. */
  queueType: DynamicQueueType,
}

export const recommendationsApi = baseHomeServerApi
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * The artist spotlight for the current user. The server's pick is stable
       * for the calendar day, so no invalidation tags; a fresh session fetches
       * a fresh copy.
       */
      getMusicArtistSpotlight: builder.query<{ spotlight: MusicArtistSpotlightType | null }, void>({
        query: () => '/music/spotlight/artist',
      }),
    }),
  })

export const {
  useGetMusicArtistSpotlightQuery,
} = recommendationsApi
