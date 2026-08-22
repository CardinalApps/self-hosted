import queryParams from '../../lib/net/queryParams'

import { baseHomeServerApi } from './baseHomeServerApi'

/* Mirrors the Media Server's connect SDK. `not_approved` and `suspended` are the cloud's access
   gates: the server keeps retrying on its own, so neither is a dead end the user has to clear. */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'auth_failed'
  | 'not_approved'
  | 'suspended'

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
  vanityHostname: string | null,
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

// `pending` means the name is claimed but no certificate covers it yet, so it is not dialable
export type VanityState = 'pending' | 'live' | 'failed'

export type VanityStatus = {
  labels: string[],
  primary: string | null,
  state: VanityState | null,
}

export type VanityAvailability = {
  name: string,
  available: boolean,
  reason?: string,
}

/* `not_available` is the media server's own refusal (Remote Access off, or no cloud credential);
   every other code is the Remote Access Server's, passed through untouched. */
export type VanityErrorCode =
  | 'invalid_name'
  | 'name_unavailable'
  | 'label_limit_reached'
  | 'rename_cooldown'
  | 'cert_unavailable'
  | 'vanity_disabled'
  | 'not_available'
  | 'unknown'

export type VanityError = {
  status: number | null,
  code: VanityErrorCode,
  limit?: number,
  retryAfterSeconds?: number,
}

const VANITY_ERROR_CODES: VanityErrorCode[] = [
  'invalid_name',
  'name_unavailable',
  'label_limit_reached',
  'rename_cooldown',
  'cert_unavailable',
  'vanity_disabled',
]

/*
 * Reads a vanity refusal out of an RTK Query error. The 400 is Nest's own, so its body carries no
 * vanity code at all and its `error` field is the HTTP status text — which is why the body is only
 * trusted when it names a code this API actually defines.
 */
export function parseVanityError(error: unknown): VanityError {
  const status = (error as { status?: unknown })?.status
  const httpStatus = typeof status === 'number' ? status : null
  const data = (error as { data?: unknown })?.data as Record<string, unknown> | undefined
  const code = typeof data?.error === 'string' ? data.error : null

  if (code && (VANITY_ERROR_CODES as string[]).includes(code)) {
    return {
      status: httpStatus,
      code: code as VanityErrorCode,
      ...(typeof data?.limit === 'number' ? { limit: data.limit } : {}),
      ...(typeof data?.retryAfterSeconds === 'number' ? { retryAfterSeconds: data.retryAfterSeconds } : {}),
    }
  }

  if (httpStatus === 400) {
    return { status: httpStatus, code: 'not_available' }
  }

  return { status: httpStatus, code: 'unknown' }
}

/*
 * The two names a server answers to, as URLs. Both are rebuilt from `directUrl` rather than from
 * the hostnames alone: it is the only field carrying the port the cloud actually reached this
 * server on, and it swaps itself to the vanity name as soon as one goes live.
 */
export function connectUrls(
  status: ConnectStatus | undefined,
  vanityLabel: string | null,
): { assigned: string | null, vanity: string | null } {
  if (!status?.directUrl || !status.hostname) {
    return { assigned: null, vanity: null }
  }

  const zone = status.hostname.split('.').slice(1).join('.')
  const vanityHostname = status.vanityHostname ?? (vanityLabel && zone ? `${vanityLabel}.${zone}` : null)

  return {
    assigned: withHostname(status.directUrl, status.hostname),
    vanity: withHostname(status.directUrl, vanityHostname),
  }
}

function withHostname(url: string, hostname: string | null): string | null {
  if (!hostname) {
    return null
  }

  try {
    const parsed = new URL(url)
    parsed.hostname = hostname
    return parsed.origin
  } catch {
    return null
  }
}

export const remoteAccessApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['RemoteAccess.Status', 'RemoteAccess.PortMapper', 'RemoteAccess.CorsOrigins', 'RemoteAccess.Vanity'],
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

      getVanity: builder.query<VanityStatus, void>({
        query: () => queryParams('/connect/vanity'),
        providesTags: ['RemoteAccess.Vanity'],
      }),

      // Cached per name, so retyping a name already probed answers without another round trip
      getVanityAvailability: builder.query<VanityAvailability, string>({
        query: (name) => queryParams('/connect/vanity/availability', { name }),
      }),

      /* Both writes move the hostname the direct URL is built from, so the connect status is stale
         the moment they land. */
      setVanity: builder.mutation<VanityStatus, { name: string }>({
        query: (body) => ({
          url: '/connect/vanity',
          method: 'PUT',
          body,
        }),
        invalidatesTags: ['RemoteAccess.Vanity', 'RemoteAccess.Status'],
      }),

      releaseVanity: builder.mutation<VanityStatus, string>({
        query: (name) => ({
          url: queryParams('/connect/vanity', { name }),
          method: 'DELETE',
        }),
        invalidatesTags: ['RemoteAccess.Vanity', 'RemoteAccess.Status'],
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
  useGetVanityQuery,
  useGetVanityAvailabilityQuery,
  useSetVanityMutation,
  useReleaseVanityMutation,
} = remoteAccessApi
