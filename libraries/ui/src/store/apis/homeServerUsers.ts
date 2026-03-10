import queryParams from '../../lib/net/queryParams'
import { CommonSortParams, PaginationParams } from '../types/api'
import { UserType } from '../../types/user'
import { baseHomeServerApi } from './baseHomeServerApi'
import { MusicTrackType } from './musicTracks'

export type MusicHistorySortParams = CommonSortParams | 'sortTitle' | 'trackNumber'
export type MusicHistoryEntryType = {
  createdAt: string,
  id: number,
  progress: number,
  playbackEntryId: string,
  track: MusicTrackType,
  user: UserType,
  [key: string]: unknown,
}

export const usersApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['Users.List', 'Licensing.Seats'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * Query users.
       */
      getUsers: builder.query<
        [UserType[], number],
        PaginationParams & {
          roles?: boolean,
        }
      >({
        query: ({ roles, take, skip }) => {
          return queryParams('/users', {
            ...(roles ? { roles } : {}),
            ...(take ? { take } : {}),
            ...(skip ? { skip } : {}),
          })
        },
        providesTags: ['Users.List'],
      }),

      /**
       * Get server owner.
       */
      getServerOwner: builder.query({
        query: () => {
          return queryParams('/users/owner')
        },
        providesTags: ['Users.List'],
      }),

      /**
       * Update a user.
       */
      updateUser: builder.mutation({
        query: ({ id, body }) => ({
          url: `/users/${id}`,
          method: 'PATCH',
          body,
        }),
        invalidatesTags: ['Users.List', 'Licensing.Seats'],
      }),

      /**
       * Update a user.
       */
      createUser: builder.mutation({
        query: ({ body }) => ({
          url: `/users`,
          method: 'POST',
          body,
        }),
        invalidatesTags: ['Users.List'],
      }),
    }),
  })

export const {
  useGetUsersQuery,
  useGetServerOwnerQuery,
  useUpdateUserMutation,
  useCreateUserMutation,
} = usersApi
