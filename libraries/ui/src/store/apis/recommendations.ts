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
  /** When the artist or release was last played, only for `rediscover`. */
  lastPlayedAt?: string,
}

export type MusicArtistSpotlightType = {
  musicArtistId: string,
  name: string,
  reason: MusicSpotlightReasonType,
  /** The dynamic queue type that best fits the reason the artist was picked. */
  queueType: DynamicQueueType,
}

export type MusicReleaseSpotlightType = {
  musicReleaseId: string,
  title: string,
  reason: MusicSpotlightReasonType,
  /** The release's primary artist, null when the release has none. */
  artistName: string | null,
  musicArtistId: string | null,
  /** The dynamic queue type that best fits the reason the release was picked. */
  queueType: DynamicQueueType,
}

/**
 * A track spotlight carries no queue type: a track can't seed a dynamic queue,
 * so the block plays the track itself and offers a mix of its release instead.
 */
export type MusicTrackSpotlightType = {
  musicTrackId: string,
  title: string,
  reason: MusicSpotlightReasonType,
  artistName: string | null,
  musicArtistId: string | null,
  musicReleaseId: string | null,
  releaseTitle: string | null,
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

      /**
       * The release spotlight for the current user. Runs its own sequence, so
       * its picks are independent of the artist spotlight's; same daily
       * stability, and the same null once the sequence runs out.
       */
      getMusicReleaseSpotlight: builder.query<{ spotlight: MusicReleaseSpotlightType | null }, { position?: number } | void>({
        query: (arg) => queryParams('/music/spotlight/release', {
          ...(arg && arg.position ? { position: arg.position } : {}),
        }),
      }),

      /**
       * The track spotlight for the current user, on its own daily sequence.
       * A track's reasons are the sharper ones: on repeat this week, just
       * favorited, or never heard.
       */
      getMusicTrackSpotlight: builder.query<{ spotlight: MusicTrackSpotlightType | null }, { position?: number } | void>({
        query: (arg) => queryParams('/music/spotlight/track', {
          ...(arg && arg.position ? { position: arg.position } : {}),
        }),
      }),
    }),
  })

export const {
  useGetMusicArtistSpotlightQuery,
  useGetMusicReleaseSpotlightQuery,
  useGetMusicTrackSpotlightQuery,
} = recommendationsApi
