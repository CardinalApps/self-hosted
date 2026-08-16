type Option = {
  name: string,
  default: string | boolean | null | undefined,
}

/**
 * Reads a boolean option, where the row not existing yet counts as the given
 * default. Options are stored as strings and `getOption` returns null for a
 * missing row, so every caller would otherwise repeat this coercion.
 */
export function isOptionEnabled(value: unknown, whenUnset = false): boolean {
  if (value === null || value === undefined || value === '') {
    return whenUnset
  }

  return value === true || value === 'true'
}

// FIXME move this to the db service
export const OPTIONS = {
  DATABASE_VERSION: <Option>{
    name: 'database_version',
    default: null,
  },
  FIRST_TIME_SETUP_DONE: <Option>{
    name: 'first_time_setup_done',
    default: false,
  },
  // This assumes the user is running the stable release
  CURRENT_CONTAINER_VERSION: <Option>{
    name: 'current_container_released_at',
    default: undefined,
  },
  LAST_CHECKED_FOR_UPDATES_AT: <Option>{
    name: 'last_checked_for_updates_at',
    default: undefined,
  },
  INSTALLED_AT: <Option>{
    name: 'installed_at',
    default: undefined,
  },
  INSTANCE_ID: <Option>{
    name: 'instance_id',
    default: undefined,
  },
  CLAIMED_AT: <Option>{
    name: 'claimed_at',
    default: undefined,
  },
  CLAIM_ID: <Option>{
    name: 'claim_id',
    default: undefined,
  },
  // Remote Access (the "Connect" feature). Opt-in via the Admin app.
  CONNECT_ENABLED: <Option>{
    name: 'connect_enabled',
    default: false,
  },
  // Long-lived credential issued by the cloud IDP; exchanged for short-lived
  // access tokens that authenticate the WSS control channel
  CONNECT_SERVER_TOKEN: <Option>{
    name: 'connect_server_token',
    default: undefined,
  },
  // base64 of 32 bytes, assigned by the Remote Access Server on registration
  CONNECT_SIGNING_KEY: <Option>{
    name: 'connect_signing_key',
    default: undefined,
  },
  // The Cardinal-assigned hostname (Path 2), e.g. <instanceId>.connect.cardinalapps.host
  CONNECT_HOSTNAME: <Option>{
    name: 'connect_hostname',
    default: undefined,
  },
  CONNECT_TLS_CERT_PEM: <Option>{
    name: 'connect_tls_cert_pem',
    default: undefined,
  },
  CONNECT_TLS_KEY_PEM: <Option>{
    name: 'connect_tls_key_pem',
    default: undefined,
  },
  // The relay hostname the Remote Access Server advertises on registration; unset falls back to
  // CONNECT_RELAY_HOST. Display-only: it names the relay in the Admin app
  CONNECT_RELAY_HOST: <Option>{
    name: 'connect_relay_host',
    default: undefined,
  },
  // User-provided FQDN (Path 1); null/unset for Path 2
  CONNECT_BYO_HOSTNAME: <Option>{
    name: 'connect_byo_hostname',
    default: undefined,
  },
  // The externally reachable port reported in `register`. Written by the
  // PortMapper on a successful mapping; falls back to the server's own
  // listening port when unset
  CONNECT_PUBLIC_PORT: <Option>{
    name: 'connect_public_port',
    default: undefined,
  },
  // UPnP/NAT-PMP automatic port mapping. Opt-in via the Admin app; only works
  // with host networking
  PORT_MAPPING_ENABLED: <Option>{
    name: 'port_mapping_enabled',
    default: false,
  },
  // The port for the Remote Access HTTPS listener (also the port the
  // PortMapper maps). Unset means DEFAULT_MEDIA_SERVER_PORT
  CONNECT_HTTPS_PORT: <Option>{
    name: 'connect_https_port',
    default: undefined,
  },
}
