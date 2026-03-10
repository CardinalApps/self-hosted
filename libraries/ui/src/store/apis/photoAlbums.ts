import { queryParams } from '../../lib/net/queryParams'

import { baseHomeServerApi } from './baseHomeServerApi'

export const GET_PHOTO_ALBUMS_DEFAULT_OPTIONS = {
  take: 10000,
  skip: 0,
  order: 'desc',
}

export const GET_PHOTO_ALBUM_ENTRIES_DEFUALT_OPTIONS = {
  take: 9999999,
  skip: 0,
  order: 'desc',
}

export const photoAlbumsApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['PhotoAlbums'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * Get a photo album.
       */
      getPhotoAlbum: builder.query({
        query: ({
          photoAlbumId,
        }) => queryParams(`/photo-album/${photoAlbumId}`),
      }),

      /**
       * Get all photo albums.
       */
      getPhotoAlbums: builder.query({
        query: ({
          take = GET_PHOTO_ALBUMS_DEFAULT_OPTIONS.take,
          skip = GET_PHOTO_ALBUMS_DEFAULT_OPTIONS.skip,
          order = GET_PHOTO_ALBUMS_DEFAULT_OPTIONS.order,
        }) => queryParams(`/photo-albums`, {
          order,
          take,
          skip,
        }),
        providesTags: ['PhotoAlbums'],
      }),

      /**
       * Get all entries in a photo album.
       */
      getPhotoAlbumEntries: builder.query({
        query: ({
          photoAlbumId,
          take = GET_PHOTO_ALBUMS_DEFAULT_OPTIONS.take,
          skip = GET_PHOTO_ALBUMS_DEFAULT_OPTIONS.skip,
          order = GET_PHOTO_ALBUMS_DEFAULT_OPTIONS.order,
          joinPhoto = true,
          joinPhotoAlbum = true,
          featured = undefined,
        }) => queryParams(`/photo-album/${photoAlbumId}/entries`, {
          order,
          take,
          skip,
          joinPhoto,
          joinPhotoAlbum,
          featured,
        }),
      }),

      /**
       * Create a photo album.
       */
      createPhotoAlbum: builder.mutation({
        query: (body) => ({
          url: '/photo-album',
          method: 'POST',
          body,
        }),
        invalidatesTags: ['PhotoAlbums'],
      }),

      /**
       * Delete a photo album
       */
      deletePhotoAlbum: builder.mutation({
        query: ({ id, body }) => ({
          url: `/photo-album/${id}`,
          method: 'DELETE',
          body,
        }),
        invalidatesTags: ['PhotoAlbums'],
      }),
    }),
  })

export const {
  useGetPhotoAlbumQuery,
  useGetPhotoAlbumsQuery,
  useGetPhotoAlbumEntriesQuery,
  useCreatePhotoAlbumMutation,
  useDeletePhotoAlbumMutation,
} = photoAlbumsApi
