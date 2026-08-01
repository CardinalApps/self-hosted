import queryParams from '../../lib/net/queryParams'
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
       * The artist spotlight for the current user. The server's picks are
       * stable for the calendar day, so no invalidation tags; a fresh session
       * fetches a fresh copy. Each position in a page's sequence of spotlights
       * gets a different artist and reason, until the server runs out and
       * returns a null spotlight.
       */
      getMusicArtistSpotlight: builder.query<{ spotlight: MusicArtistSpotlightType | null }, { position?: number } | void>({
        query: (arg) => queryParams('/music/spotlight/artist', {
          ...(arg && arg.position ? { position: arg.position } : {}),
        }),
      }),
    }),
  })

export const {
  useGetMusicArtistSpotlightQuery,
} = recommendationsApi
