import queryParams from '../../lib/net/queryParams'

import { CommonOrderParams, PaginationParams } from '../types/api'
import { baseHomeServerApi } from './baseHomeServerApi'

export type Library = {
  id: number
  libraryId: string,
  name: string,
  paths: string[],
  [key: string]: unknown,
}

export const librariesApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['AllLibraries'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * Queries.
       */
      getLibraries: builder.query<
        Library[],
        PaginationParams & {
          order?: CommonOrderParams,
          orderBy?: 'name' | 'createdAt',
        }
      >({
        query: ({ take, skip, order, orderBy }) => {
          return queryParams('/libraries', {
            ...(take && { take }),
            ...(skip && { skip }),
            ...(order && { order }),
            ...(orderBy && { orderBy }),
          })
        },
        providesTags: ['AllLibraries'],
      }),

      /**
       * Mutations.
       */
      createLibrary: builder.mutation<
        Library,
        Partial<Library>
      >({
        query: (body) => ({
          url: '/library',
          method: 'POST',
          body,
        }),
        invalidatesTags: ['AllLibraries'],
      }),

      updateLibrary: builder.mutation<
        Library,
        { id: string | number, body: Partial<Library> }
      >({
        query: ({ id, body }) => ({
          url: `/library/${id}`,
          method: 'PATCH',
          body: { ...body },
        }),
        invalidatesTags: ['AllLibraries'],
      }),

      deleteLibrary: builder.mutation<
        void,
        string | number
      >({
        query: (id) => ({
          url: `/library/${id}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['AllLibraries'],
      }),
    }),
  })

export const {
  useGetLibrariesQuery,
  useLazyGetLibrariesQuery,
  useCreateLibraryMutation,
  useUpdateLibraryMutation,
  useDeleteLibraryMutation,
} = librariesApi
