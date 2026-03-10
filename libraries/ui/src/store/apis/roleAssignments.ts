import { MediaServerRoleNames } from '@cardinalapps/access-control/src'

import queryParams from '../../lib/net/queryParams'
import { UserType } from '../../types/user'

import { CommonOrderParams, PaginationParams } from '../types/api'
import { baseHomeServerApi } from './baseHomeServerApi'

export type RoleAssignmentEntity = {
  id: string,
  createdAt: string,
  role: MediaServerRoleNames,
  user: UserType,
}

export const roleAssignmentsApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['RoleAssignments.List'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * Queries.
       */
      getRoleAssignments: builder.query<
        [RoleAssignmentEntity[], number],
        PaginationParams & {
          order?: CommonOrderParams,
          orderBy?: 'name' | 'createdAt',
          userId?: string,
        }
      >({
        query: ({ take, skip, order, orderBy, userId }) => {
          return queryParams('/roles/assignments', {
            ...(take && { take }),
            ...(skip && { skip }),
            ...(order && { order }),
            ...(orderBy && { orderBy }),
            ...(userId && { userId }),
          })
        },
        providesTags: ['RoleAssignments.List'],
      }),

      /**
       * Mutations.
       */
      createRoleAssignments: builder.mutation<
        RoleAssignmentEntity[],
        {
          userIds: string[],
          role: MediaServerRoleNames,
        }
      >({
        query: ({ role, userIds }) => ({
          url: `/roles/${role}/assignments`,
          method: 'POST',
          body: {
            userIds,
          },
        }),
        invalidatesTags: ['RoleAssignments.List'],
      }),

      deleteRoleAssignments: builder.mutation<
        RoleAssignmentEntity[],
        {
          userIds: string[],
          role: MediaServerRoleNames,
        }
      >({
        query: ({ role, userIds }) => ({
          url: queryParams(`/roles/${role}/assignments`, { userIds }),
          method: 'DELETE',
        }),
        invalidatesTags: ['RoleAssignments.List'],
      }),
    }),
  })

export const {
  useGetRoleAssignmentsQuery,
  useCreateRoleAssignmentsMutation,
  useDeleteRoleAssignmentsMutation,
} = roleAssignmentsApi
