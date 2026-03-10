import queryParams from '../../lib/net/queryParams'
import { UserType } from '../../types/user'

import { CommonOrderParams, PaginationParams } from '../types/api'
import { baseHomeServerApi } from './baseHomeServerApi'

type InvitationTypeType = 'link' | 'user'

export type InvitationType = {
  createdAt: string,
  createdBy: UserType,
  type: InvitationTypeType,
  cloudLink?: string,
  userFriendlyCode?: string,
  invitee?: UserType,
  expiresAt: Date,
  invitationId: string,
}

export const invitationApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['Invitation.List'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getInvitations: builder.query<
        [InvitationType[], number],
        PaginationParams & {
          order?: CommonOrderParams,
          orderBy?: 'createdAt',
          type?: InvitationTypeType,
          isExpired?: boolean,
        }
      >({
        query: ({ take, skip, order, orderBy, type, isExpired }) => {
          return queryParams('/invitations', {
            ...(take && { take }),
            ...(skip && { skip }),
            ...(order && { order }),
            ...(orderBy && { orderBy }),
            ...(type && { type }),
            ...(typeof isExpired !== 'undefined' && { isExpired }),
          })
        },
        providesTags: ['Invitation.List'],
      }),

      createInvitation: builder.mutation<
        InvitationType,
        Partial<InvitationType>
      >({
        query: (body) => ({
          url: '/invitations',
          method: 'POST',
          body,
        }),
        invalidatesTags: ['Invitation.List'],
      }),

      deleteInvitation: builder.mutation<
        boolean,
        string
      >({
        query: (id) => ({
          url: `invitations/${id}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['Invitation.List'],
      }),
    }),
  })

export const {
  useGetInvitationsQuery,
  useCreateInvitationMutation,
  useDeleteInvitationMutation,
} = invitationApi
