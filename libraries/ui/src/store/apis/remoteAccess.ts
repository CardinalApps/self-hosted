import queryParams from '../../lib/net/queryParams'

import { baseHomeServerApi } from './baseHomeServerApi'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'auth_failed'

export type HttpsListenerStatus = {
  state: 'stopped' | 'running' | 'error',
  port: number | null,
  certExpiresAt: string | null,
  lastError: string | null,
}

export type ConnectStatus = {
  enabled: boolean,
  state: ConnectionState,
  hostname: string | null,
  signingKeyFingerprint: string | null,
  tokenExpiresAt: string | null,
  publicPort: number | null,
  directUrl: string | null,
  relayUrl: string | null,
  https: HttpsListenerStatus,
}

export type PortMapperState = 'disabled' | 'not_attempted' | 'active' | 'failed'
export type PortMapperFailureReason = 'port_conflict' | 'no_gateway' | 'docker_bridge' | 'unknown'

export type PortMapperStatus = {
  state: PortMapperState,
  reason?: PortMapperFailureReason,
  externalIp?: string | null,
  externalPort?: number,
  internalPort?: number,
  leaseExpiresAt?: string,
  lastAttemptAt?: string,
}

export type CorsOriginType = {
  corsOriginId: string,
  origin: string,
  addedByUserId?: string,
}

export const remoteAccessApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['RemoteAccess.Status', 'RemoteAccess.PortMapper', 'RemoteAccess.CorsOrigins'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getConnectStatus: builder.query<ConnectStatus, void>({
        query: () => queryParams('/connect/status'),
        providesTags: ['RemoteAccess.Status'],
      }),

      /* Enabling mints a cloud credential, so it needs the cloud JWT. It rides along
         automatically as the CardinalTolkien header whenever the user is logged into the cloud. */
      enableRemoteAccess: builder.mutation<ConnectStatus, void>({
        query: () => ({
          url: '/connect/enable',
          method: 'POST',
        }),
        invalidatesTags: ['RemoteAccess.Status', 'RemoteAccess.PortMapper'],
      }),

      disableRemoteAccess: builder.mutation<ConnectStatus, void>({
        query: () => ({
          url: '/connect/disable',
          method: 'POST',
        }),
        invalidatesTags: ['RemoteAccess.Status', 'RemoteAccess.PortMapper'],
      }),

      getPortMapperStatus: builder.query<PortMapperStatus, void>({
        query: () => queryParams('/port-mapper/status'),
        providesTags: ['RemoteAccess.PortMapper'],
      }),

      updatePortMapperSettings: builder.mutation<PortMapperStatus, { enabled: boolean }>({
        query: (body) => ({
          url: '/port-mapper/settings',
          method: 'PUT',
          body,
        }),
        invalidatesTags: ['RemoteAccess.PortMapper'],
      }),

      getCorsOrigins: builder.query<CorsOriginType[], void>({
        query: () => queryParams('/cors-origins'),
        providesTags: ['RemoteAccess.CorsOrigins'],
      }),

      addCorsOrigin: builder.mutation<CorsOriginType, { origin: string }>({
        query: (body) => ({
          url: '/cors-origins',
          method: 'POST',
          body,
        }),
        invalidatesTags: ['RemoteAccess.CorsOrigins'],
      }),

      deleteCorsOrigin: builder.mutation<void, string>({
        query: (corsOriginId) => ({
          url: `/cors-origins/${corsOriginId}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['RemoteAccess.CorsOrigins'],
      }),
    }),
  })

export const {
  useGetConnectStatusQuery,
  useEnableRemoteAccessMutation,
  useDisableRemoteAccessMutation,
  useGetPortMapperStatusQuery,
  useUpdatePortMapperSettingsMutation,
  useGetCorsOriginsQuery,
  useAddCorsOriginMutation,
  useDeleteCorsOriginMutation,
} = remoteAccessApi
