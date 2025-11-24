import queryParams from '../../lib/net/queryParams'
import { CommonSortParams } from '../types/api'
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
    addTagTypes: ['Users.List'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getUsers: builder.query({
        query: () => {
          return queryParams('/users')
        },
        providesTags: ['Users.List'],
      }),
    }),
  })

export const {
  useGetUsersQuery,
} = usersApi
