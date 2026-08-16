import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import Card from '@cardinalapps/ui/src/components/layout/Card'
import Drawer from '@cardinalapps/ui/src/components/layout/Drawer'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import FormField from '@cardinalapps/ui/src/components/forms/FormField'
import TextInput from '@cardinalapps/ui/src/components/forms/TextInput'
import ToggleSwitch from '@cardinalapps/ui/src/components/forms/ToggleSwitch'
import Alert from '@cardinalapps/ui/src/components/interaction/Alert'
import Confirm from '@cardinalapps/ui/src/components/interaction/Confirm'
import List from '@cardinalapps/ui/src/components/interaction/List'
import type { ListItem, ListItemControls } from '@cardinalapps/ui/src/components/interaction/List/List'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import sync from '@cardinalapps/ui/src/store/slices/settings/thunks/sync'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import useHasCapability from '@cardinalapps/ui/src/hooks/useHasCapability'
import { CardinalApp } from '@cardinalapps/ui/src/lib/env/cardinal'

import {
  useGetConnectStatusQuery,
  useGetPortMapperStatusQuery,
  useUpdatePortMapperSettingsMutation,
  useGetCorsOriginsQuery,
  useAddCorsOriginMutation,
  useDeleteCorsOriginMutation,
} from '@cardinalapps/ui/src/store/apis/remoteAccess'
import type { ConnectionState, CorsOriginType, HttpsListenerStatus, PortMapperStatus } from '@cardinalapps/ui/src/store/apis/remoteAccess'

import { ENABLE_REMOTE_ACCESS_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access'
import { ENABLE_REMOTE_ACCESS_DIRECT_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access_direct'
import { ENABLE_REMOTE_ACCESS_RELAY_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access_relay'
import { ENABLE_REMOTE_ACCESS_UPNP_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access_upnp'

import * as routes from '../../routes'

import i18n from './i18n.json'

const STATUS_POLL_MS = 5000
const PORT_MAPPER_POLL_MS = 30000

/* The port mapper works but has never been validated against real routers, so the surface stays
   hidden while the whole server-side implementation keeps shipping. Flip this to reveal it. */
const SHOW_UPNP = false

// A copyable row for a connection URL, or nothing when that path is off or unassigned
function urlItem(value: string, url: string | null | undefined): ListItem[] {
  if (!url) {
    return []
  }

  return [{
    value,
    name: url,
    title: url,
    copyable: url,
    controls: ['copy'],
  }]
}

/*
 * An origin is scheme://host[:port] and nothing else. URL normalization is what rejects paths,
 * queries, and fragments: they all make `origin` differ from the input.
 */
export function parseCorsOrigin(input: string): string | null {
  const trimmed = input.trim().replace(/\/$/, '')

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null
  }

  return url.origin === trimmed ? url.origin : null
}

type ConfigureRemoteAccessDrawerProps = {
  onClose: () => void,
}

// Everything beyond the on/off switches: URLs, live statuses, UPnP, and CORS origins
function ConfigureRemoteAccessDrawer({ onClose }: ConfigureRemoteAccessDrawerProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const settings = useSelector(settingsSelectors.current)
  const { lang } = settings
  const canUpdate = useHasCapability('ServerSettings.Update')

  /* Only the hostname, URLs, and live states come from here. The switches read the settings slice,
     which is seeded and persisted client-side, so they paint in the right position instead of
     flipping. */
  const { data: status } = useGetConnectStatusQuery(undefined, {
    skip: !canUpdate,
    pollingInterval: STATUS_POLL_MS,
  })
  const { data: portMapper } = useGetPortMapperStatusQuery(undefined, {
    skip: !canUpdate || !SHOW_UPNP,
    pollingInterval: PORT_MAPPER_POLL_MS,
  })
  const { data: corsOrigins } = useGetCorsOriginsQuery(undefined, { skip: !canUpdate })

  const [updatePortMapperSettings] = useUpdatePortMapperSettingsMutation()
  const [addCorsOrigin] = useAddCorsOriginMutation()
  const [deleteCorsOrigin] = useDeleteCorsOriginMutation()

  const [upnpSaving, setUpnpSaving] = useState(false)
  const [originDraft, setOriginDraft] = useState('')
  const [originError, setOriginError] = useState<string | null>(null)
  const [originToDelete, setOriginToDelete] = useState<CorsOriginType | null>(null)

  const enabled = settings[ENABLE_REMOTE_ACCESS_SLUG] === true
  const directEnabled = enabled && settings[ENABLE_REMOTE_ACCESS_DIRECT_SLUG] === true
  const relayEnabled = enabled && settings[ENABLE_REMOTE_ACCESS_RELAY_SLUG] === true
  const upnpEnabled = enabled && settings[ENABLE_REMOTE_ACCESS_UPNP_SLUG] === true

  // The Media Server owns this setting: enabling maps the port right away
  const setUpnp = async (value: boolean) => {
    setUpnpSaving(true)
    await updatePortMapperSettings({ enabled: value })
    await dispatch(sync(CardinalApp.ADMIN))
    setUpnpSaving(false)
  }

  const handleAddOrigin = async () => {
    const origin = parseCorsOrigin(originDraft)

    if (!origin) {
      setOriginError(i18n['ra.cors.invalid'][lang])
      return
    }

    if (corsOrigins?.some((existing) => existing.origin === origin)) {
      setOriginError(i18n['ra.cors.duplicate'][lang])
      return
    }

    setOriginError(null)
    await addCorsOrigin({ origin })
    setOriginDraft('')
  }

  const handleDeleteOrigin = async () => {
    if (originToDelete) {
      await deleteCorsOrigin(originToDelete.corsOriginId)
    }
    setOriginToDelete(null)
  }

  const connectionItem = (state: ConnectionState): ListItem[] => {
    const labels: Record<ConnectionState, string> = {
      connected: i18n['ra.status.connected'][lang],
      connecting: i18n['ra.status.reconnecting'][lang],
      disconnected: i18n['ra.status.reconnecting'][lang],
      auth_failed: i18n['ra.status.auth-failed'][lang],
      not_approved: i18n['ra.status.not-approved'][lang],
      suspended: i18n['ra.status.suspended'][lang],
    }

    return [{
      value: 'connection-state',
      name: i18n['ra.status.label'][lang],
      label: labels[state],
    }]
  }

  const httpsItem = (https: HttpsListenerStatus): ListItem[] => {
    const labels = {
      running: i18n['ra.https.running'][lang],
      stopped: i18n['ra.https.stopped'][lang],
      error: i18n['ra.https.error'][lang],
    }

    return [{
      value: 'https-listener',
      name: i18n['ra.https.label'][lang],
      title: https.state === 'error' ? https.lastError ?? undefined : https.port ? `:${https.port}` : undefined,
      label: labels[https.state],
    }]
  }

  const upnpStatusItem = (mapper: PortMapperStatus): ListItem[] => {
    if (mapper.state === 'active') {
      return [{
        value: 'upnp-status',
        name: `${mapper.externalIp ?? '?'}:${mapper.externalPort}`,
        label: i18n['ra.upnp.status.active'][lang],
      }]
    }

    if (mapper.state === 'failed') {
      return [{
        value: 'upnp-status',
        name: i18n[`ra.upnp.reason.${mapper.reason ?? 'unknown'}`]?.[lang] ?? i18n['ra.upnp.reason.unknown'][lang],
        label: i18n['ra.upnp.status.failed'][lang],
      }]
    }

    return [{
      value: 'upnp-status',
      name: i18n['ra.upnp.status.waiting'][lang],
    }]
  }

  return (
    <Drawer
      className="configure-remote-access-drawer"
      title={i18n['ra.drawer.title'][lang]}
      onClose={onClose}
    >
      <Drawer.Section title={i18n['ra.drawer.direct.title'][lang]}>
        <Card padding="thin">
          <List
            layout="compact"
            items={[
              ...urlItem('direct-url', directEnabled ? status?.directUrl : null),
              ...(status ? httpsItem(status.https) : []),
              ...(SHOW_UPNP ? [{
                value: 'upnp',
                name: i18n['ra.upnp.label'][lang],
                label: (
                  <ToggleSwitch
                    name="enable-upnp"
                    value={upnpEnabled}
                    disabled={!enabled || !canUpdate || upnpSaving}
                    onChange={(value) => setUpnp(value)}
                  />
                ),
              }] : []),
              ...(SHOW_UPNP && upnpEnabled && portMapper ? upnpStatusItem(portMapper) : []),
            ]}
          />

          {SHOW_UPNP && portMapper?.state === 'failed' && portMapper.reason === 'docker_bridge' && (
            <Alert
              type="info"
              message={i18n['ra.upnp.docker-bridge-banner'][lang]}
            />
          )}

          <FormField
            className="cors-origins"
            label={i18n['ra.cors.title'][lang]}
            labelFor="cors-origin-draft"
            error={originError ?? undefined}
          >
            {corsOrigins?.length
              ? <List
                  layout="compact"
                  items={corsOrigins.map((origin): ListItem => ({
                    value: origin.corsOriginId,
                    name: origin.origin,
                    title: origin.origin,
                    controls: enabled && canUpdate ? (['delete'] as ListItemControls[]) : [],
                    onDelete: () => setOriginToDelete(origin),
                  }))}
                />
              : <p className="cors-empty">{i18n['ra.cors.desc'][lang]}</p>
            }

            <div className="cors-add">
              <TextInput
                name="cors-origin-draft"
                value={originDraft}
                placeholder={i18n['ra.cors.placeholder'][lang]}
                disabled={!enabled || !canUpdate}
                onChange={(value) => {
                  setOriginDraft(value)
                  setOriginError(null)
                }}
                onEnter={handleAddOrigin}
              />
              <Icon fa="fas fa-plus-circle" onClick={() => enabled && canUpdate && handleAddOrigin()} />
            </div>
          </FormField>
        </Card>
      </Drawer.Section>

      <Drawer.Section title={i18n['ra.drawer.relay.title'][lang]}>
        <Card padding="thin">
          <List
            layout="compact"
            items={[
              ...urlItem('relay-url', relayEnabled ? status?.relayUrl : null),
              ...(status ? connectionItem(status.state) : []),
            ]}
          />

          {status?.state === 'auth_failed' && (
            <Alert
              type="error"
              message={i18n['ra.auth-failed.desc'][lang]}
              buttons={[{
                label: i18n['ra.auth-failed.cta'][lang],
                onClick: () => navigate(routes.LOGIN),
              }]}
            />
          )}

          {/* Both gates clear on Cardinal's side, so neither offers a remedy to click */}
          {status?.state === 'not_approved' && (
            <Alert
              type="info"
              message={i18n['ra.not-approved.desc'][lang]}
            />
          )}

          {status?.state === 'suspended' && (
            <Alert
              type="warning"
              message={i18n['ra.suspended.desc'][lang]}
            />
          )}
        </Card>
      </Drawer.Section>

      {!!originToDelete && (
        <Confirm
          title={i18n['ra.cors.confirm-delete.title'][lang]}
          message={i18n['ra.cors.confirm-delete.desc'][lang]}
          confirmButtonIsDangerous={true}
          onClose={(confirmed) => {
            if (confirmed) {
              handleDeleteOrigin()
            } else {
              setOriginToDelete(null)
            }
          }}
        />
      )}
    </Drawer>
  )
}

export default ConfigureRemoteAccessDrawer
