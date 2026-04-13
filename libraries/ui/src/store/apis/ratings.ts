import { baseHomeServerApi } from './baseHomeServerApi'

export type RatingType = {
  id: number,
  ratingId: string,
  rating: number,
  mediaType: string,
  mediaId: string,
  createdAt: string,
  updatedAt: string,
}

export const ratingsApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['MusicTrackRatings', 'MusicTracks'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      setRating: builder.mutation<RatingType, { mediaType: string, mediaId: string, rating: number }>({
        query: (body) => ({
          url: '/ratings',
          method: 'PUT',
          body,
        }),
        invalidatesTags: ['MusicTracks'],
      }),

      deleteRating: builder.mutation<void, { mediaType: string, mediaId: string }>({
        query: ({ mediaType, mediaId }) => ({
          url: `/ratings/${mediaType}/${mediaId}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['MusicTracks'],
      }),
    }),
  })

export const {
  useSetRatingMutation,
  useDeleteRatingMutation,
} = ratingsApi
