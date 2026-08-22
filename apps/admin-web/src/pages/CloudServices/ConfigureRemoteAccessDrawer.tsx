import { useEffect, useState } from 'react'
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
import set from '@cardinalapps/ui/src/store/slices/settings/thunks/set'
import sync from '@cardinalapps/ui/src/store/slices/settings/thunks/sync'
import { cloudUserSelectors } from '@cardinalapps/ui/src/store/slices/cloudUser'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import useHasCapability from '@cardinalapps/ui/src/hooks/useHasCapability'
import useServiceAccess from '@cardinalapps/ui/src/hooks/useServiceAccess'
import { CardinalApp } from '@cardinalapps/ui/src/lib/env/cardinal'
import { formatTimeUntil } from '@cardinalapps/ui/src/lib/formatting/time'

import {
  REMOTE_ACCESS_FEATURE_SLUGS,
  serviceAccessIndicator,
} from '@cardinalapps/ui/src/lib/auth/serviceAccess'

import {
  connectUrls,
  parseVanityError,
  useGetConnectStatusQuery,
  useGetPortMapperStatusQuery,
  useUpdatePortMapperSettingsMutation,
  useGetCorsOriginsQuery,
  useAddCorsOriginMutation,
  useDeleteCorsOriginMutation,
  useGetVanityQuery,
  useGetVanityAvailabilityQuery,
  useSetVanityMutation,
  useReleaseVanityMutation,
} from '@cardinalapps/ui/src/store/apis/remoteAccess'
import type {
  ConnectionState,
  CorsOriginType,
  HttpsListenerStatus,
  PortMapperStatus,
  VanityError,
  VanityState,
} from '@cardinalapps/ui/src/store/apis/remoteAccess'

import { ENABLE_REMOTE_ACCESS_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access'
import { ENABLE_REMOTE_ACCESS_DIRECT_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access_direct'
import { ENABLE_REMOTE_ACCESS_RELAY_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access_relay'
import { ENABLE_REMOTE_ACCESS_UPNP_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access_upnp'

import * as routes from '../../routes'

import i18n from './i18n.json'

const STATUS_POLL_MS = 5000
const PORT_MAPPER_POLL_MS = 30000
const AVAILABILITY_DEBOUNCE_MS = 400

/* The port mapper works but has never been validated against real routers, so the surface stays
   hidden while the whole server-side implementation keeps shipping. Flip this to reveal it. */
const SHOW_UPNP = false

// A copyable row for a connection URL, or nothing when that path is off or unassigned
function urlItem(id: string, url: string | null | undefined): ListItem[] {
  if (!url) {
    return []
  }

  return [{
    id,
    label: url,
    title: url,
    copyable: url,
    controls: ['copy'],
  }]
}

/* The one place a connection state becomes a sentence. The card asks the same question of the same
   status, so it reads its answer from here rather than keeping a second table in step. */
export function connectionStateLabel(state: ConnectionState, lang: string): string {
  const labels: Record<ConnectionState, string> = {
    connected: i18n['ra.status.connected'][lang],
    connecting: i18n['ra.status.reconnecting'][lang],
    disconnected: i18n['ra.status.reconnecting'][lang],
    auth_failed: i18n['ra.status.auth-failed'][lang],
    not_approved: i18n['ra.status.not-approved'][lang],
    suspended: i18n['ra.status.suspended'][lang],
  }

  return labels[state]
}

// The Remote Access Server normalizes before it validates, so the picker probes what it would claim
function normalizeVanityDraft(input: string): string {
  return input.trim().toLowerCase()
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

// Everything beyond the on/off switches: URLs, live statuses, the custom address, UPnP, and CORS origins
function ConfigureRemoteAccessDrawer({ onClose }: ConfigureRemoteAccessDrawerProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const settings = useSelector(settingsSelectors.current)
  const { lang } = settings
  const cloudLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const canUpdate = useHasCapability('ServerSettings.Update')

  const enabled = settings[ENABLE_REMOTE_ACCESS_SLUG] === true
  const directEnabled = enabled && settings[ENABLE_REMOTE_ACCESS_DIRECT_SLUG] === true
  const relayEnabled = enabled && settings[ENABLE_REMOTE_ACCESS_RELAY_SLUG] === true
  const upnpEnabled = enabled && settings[ENABLE_REMOTE_ACCESS_UPNP_SLUG] === true

  /* The Media Server reports a refused account and a declined one identically, because from the
     relay's side both are just an unapproved connection. The grants are the only place the
     difference is written down, so the copy comes from there rather than from the connection. */
  const { features } = useServiceAccess({ skip: !cloudLoggedIn })
  const declined = REMOTE_ACCESS_FEATURE_SLUGS.some((slug) =>
    serviceAccessIndicator(features, slug) === 'denied')

  /* Only the hostname, URLs, and live states come from here. The switches read the settings slice,
     which is seeded and persisted client-side, so they paint in the right position instead of
     flipping. */
  const { data: status, fulfilledTimeStamp: statusFetchedAt } = useGetConnectStatusQuery(undefined, {
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

  const [nameDraft, setNameDraft] = useState('')
  const [probeName, setProbeName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameNotice, setNameNotice] = useState<{ type: 'info' | 'error', message: string } | null>(null)
  const [nameToRelease, setNameToRelease] = useState<string | null>(null)

  const vanitySkipped = !canUpdate || !enabled
  const { data: vanity, error: vanityQueryError, refetch: refetchVanity } = useGetVanityQuery(undefined, {
    skip: vanitySkipped,
  })

  const [setVanity, { isLoading: assigning }] = useSetVanityMutation()
  const [releaseVanity] = useReleaseVanityMutation()

  /* The name only travels once the typing settles, and RTK caches the answer per name, so going
     back to a name already probed costs nothing. */
  useEffect(() => {
    const name = normalizeVanityDraft(nameDraft)

    if (!name) {
      setProbeName('')
      return
    }

    const timer = setTimeout(() => setProbeName(name), AVAILABILITY_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [nameDraft])

  const { data: availability, error: availabilityError, isFetching: checkingName } = useGetVanityAvailabilityQuery(probeName, {
    skip: vanitySkipped || !probeName,
  })

  /* Certificate issuance happens on Cardinal's side with no callback, so a claimed name settles on
     its own schedule. Rather than a second timer, the unsettled states borrow the status poll that
     is already running, and stop asking once there is nothing left to watch. */
  const vanitySettling = vanity?.state === 'pending' || vanity?.state === 'failed'
  useEffect(() => {
    if (statusFetchedAt && vanitySettling && !vanitySkipped) {
      refetchVanity()
    }
  }, [statusFetchedAt, vanitySettling, vanitySkipped, refetchVanity])

  const setPath = (slug: string, value: boolean) => {
    dispatch(set({
      settings: { [slug]: value },
      app: CardinalApp.ADMIN,
    }))
  }

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

  const vanityErrorMessage = (failure: VanityError): string => {
    if (failure.code === 'label_limit_reached') {
      return i18n['ra.vanity.error.label_limit_reached'][lang].replace('{limit}', String(failure.limit ?? 1))
    }

    if (failure.code === 'rename_cooldown') {
      const until = new Date(Date.now() + (failure.retryAfterSeconds ?? 0) * 1000).toISOString()
      return i18n['ra.vanity.error.rename_cooldown'][lang].replace('{wait}', formatTimeUntil(until))
    }

    return i18n[`ra.vanity.error.${failure.code}`]?.[lang] ?? i18n['ra.vanity.error.unknown'][lang]
  }

  /*
   * A refused certificate is not a refused name: the claim landed and only the issuance is waiting,
   * so both write paths keep the name and explain the wait instead of reporting a failure.
   */
  const handleAssignName = async () => {
    const name = normalizeVanityDraft(nameDraft)

    if (!name || assigning) {
      return
    }

    setNameError(null)
    const result = await setVanity({ name })

    if ('error' in result) {
      const failure = parseVanityError(result.error)

      if (failure.code !== 'cert_unavailable') {
        setNameError(vanityErrorMessage(failure))
        return
      }

      setNameNotice({ type: 'info', message: i18n['ra.vanity.cert-deferred.desc'][lang] })
      refetchVanity()
    } else {
      setNameNotice(null)
    }

    setNameDraft('')
  }

  const handleReleaseName = async () => {
    const name = nameToRelease
    setNameToRelease(null)

    if (!name) {
      return
    }

    const result = await releaseVanity(name)

    if ('error' in result) {
      const failure = parseVanityError(result.error)

      if (failure.code === 'cert_unavailable') {
        setNameNotice({ type: 'info', message: i18n['ra.vanity.cert-deferred.desc'][lang] })
        refetchVanity()
        return
      }

      setNameNotice({ type: 'error', message: vanityErrorMessage(failure) })
      return
    }

    setNameNotice(null)
  }

  /* A cloud that has the feature switched off (503) and a server with no credential to ask with
     (400) both mean there is nothing here to configure, so the whole surface goes away. */
  const vanityFailure = vanityQueryError ? parseVanityError(vanityQueryError) : null
  const showVanity = !!vanity && vanityFailure?.code !== 'vanity_disabled' && vanityFailure?.code !== 'not_available'
  const vanityName = vanity?.primary ?? null
  const { assigned: assignedUrl, vanity: vanityUrl } = connectUrls(status, vanityName)

  /* The row answers for the relay path, not the control channel: a connected server with the relay
     switched off is not "Active" here. Off — globally or per-path — is a settled answer. */
  const connectionItem = (state: ConnectionState): ListItem[] => [{
    id: 'connection-state',
    label: i18n['ra.status.label'][lang],
    value: enabled && relayEnabled ? connectionStateLabel(state, lang) : i18n['ra.status.disabled'][lang],
  }]

  const httpsItem = (https: HttpsListenerStatus): ListItem[] => {
    const labels = {
      running: i18n['ra.https.running'][lang],
      stopped: i18n['ra.https.stopped'][lang],
      error: i18n['ra.https.error'][lang],
    }

    return [{
      id: 'https-listener',
      label: i18n['ra.https.label'][lang],
      title: https.state === 'error' ? https.lastError ?? undefined : https.port ? `:${https.port}` : undefined,
      // Same settled-answer rule as the relay row: a listener that is off by choice is not "Stopped"
      value: enabled && directEnabled ? labels[https.state] : i18n['ra.status.disabled'][lang],
    }]
  }

  const vanityItem = (name: string, state: VanityState | null): ListItem[] => {
    const labels: Record<VanityState, string> = {
      pending: i18n['ra.vanity.state.pending'][lang],
      live: i18n['ra.vanity.state.live'][lang],
      failed: i18n['ra.vanity.state.failed'][lang],
    }

    const [row] = urlItem('vanity-url', vanityUrl)
    const controls: ListItemControls[] = [
      ...(row ? ['copy' as ListItemControls] : []),
      ...(canUpdate ? ['delete' as ListItemControls] : []),
    ]

    return [{
      ...(row ?? { id: 'vanity-name', label: name, title: name }),
      value: state ? labels[state] : undefined,
      controls,
      onDelete: () => setNameToRelease(name),
    }]
  }

  /* Nothing is said about a name until the probe has caught up with the field: a stale verdict from
     the previous keystroke reads as an answer about what is on screen now. */
  const availabilityNote = (): { state: string, text: string } | null => {
    const name = normalizeVanityDraft(nameDraft)

    if (!name) {
      return null
    }

    if (checkingName || probeName !== name) {
      return { state: 'checking', text: i18n['ra.vanity.checking'][lang] }
    }

    if (availabilityError) {
      return parseVanityError(availabilityError).code === 'invalid_name'
        ? { state: 'invalid', text: i18n['ra.vanity.invalid'][lang] }
        : null
    }

    if (!availability) {
      return null
    }

    return availability.available
      ? { state: 'available', text: i18n['ra.vanity.available'][lang] }
      : { state: 'taken', text: i18n['ra.vanity.taken'][lang] }
  }

  const nameHint = availabilityNote()

  const upnpStatusItem = (mapper: PortMapperStatus): ListItem[] => {
    if (mapper.state === 'active') {
      return [{
        id: 'upnp-status',
        label: `${mapper.externalIp ?? '?'}:${mapper.externalPort}`,
        value: i18n['ra.upnp.status.active'][lang],
      }]
    }

    if (mapper.state === 'failed') {
      return [{
        id: 'upnp-status',
        label: i18n[`ra.upnp.reason.${mapper.reason ?? 'unknown'}`]?.[lang] ?? i18n['ra.upnp.reason.unknown'][lang],
        value: i18n['ra.upnp.status.failed'][lang],
      }]
    }

    return [{
      id: 'upnp-status',
      label: i18n['ra.upnp.status.waiting'][lang],
    }]
  }

  return (
    <Drawer
      className="configure-remote-access-drawer"
      title={i18n['ra.drawer.title'][lang]}
      onClose={onClose}
    >
      {showVanity && (
        <Drawer.Section title={i18n['ra.vanity.title'][lang]}>
          <Card padding="thin">
            {vanityName
              ? <List
                  layout="compact"
                  items={vanityItem(vanityName, vanity.state)}
                />
              : <FormField
                  className="vanity"
                  labelFor="vanity-name-draft"
                  error={nameError ?? undefined}
                >
                  <p className="vanity-desc">{i18n['ra.vanity.desc'][lang]}</p>

                  <div className="vanity-add">
                    <TextInput
                      name="vanity-name-draft"
                      id="vanity-name-draft"
                      value={nameDraft}
                      placeholder={i18n['ra.vanity.placeholder'][lang]}
                      disabled={!canUpdate || assigning}
                      onChange={(value) => {
                        setNameDraft(value)
                        setNameError(null)
                      }}
                      onEnter={handleAssignName}
                    />
                    <Icon fa="fas fa-plus-circle" onClick={() => canUpdate && handleAssignName()} />
                  </div>

                  {!!nameHint && (
                    <p className="vanity-availability" data-state={nameHint.state}>{nameHint.text}</p>
                  )}
                </FormField>
            }

            {vanity.state === 'failed' && (
              <Alert
                type="warning"
                message={i18n['ra.vanity.failed.desc'][lang]}
              />
            )}

            {!!nameNotice && (
              <Alert
                type={nameNotice.type}
                message={nameNotice.message}
              />
            )}
          </Card>
        </Drawer.Section>
      )}

      <Drawer.Section>
        <div className="drawer-section-heading">
          <p className="drawer-section-title">{i18n['ra.drawer.direct.title'][lang]}</p>
          <ToggleSwitch
            name="enable-direct-connections"
            showActiveLabel
            labelAlign="left"
            value={directEnabled}
            disabled={!enabled || !canUpdate}
            onChange={(value) => setPath(ENABLE_REMOTE_ACCESS_DIRECT_SLUG, value)}
          />
        </div>

        <Card padding="thin">
          <List
            layout="compact"
            items={[
              ...urlItem('direct-url', directEnabled ? assignedUrl : null),
              ...(status ? httpsItem(status.https) : []),
              ...(SHOW_UPNP ? [{
                id: 'upnp',
                label: i18n['ra.upnp.label'][lang],
                value: (
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
        </Card>
      </Drawer.Section>

      <Drawer.Section>
        <div className="drawer-section-heading">
          <p className="drawer-section-title">{i18n['ra.drawer.relay.title'][lang]}</p>
          <ToggleSwitch
            name="enable-relay-connections"
            showActiveLabel
            labelAlign="left"
            value={relayEnabled}
            disabled={!enabled || !canUpdate}
            onChange={(value) => setPath(ENABLE_REMOTE_ACCESS_RELAY_SLUG, value)}
          />
        </div>

        <Card padding="thin">
          {/* The relay only accepts bearer-authenticated requests, so its URL is never shown as pastable.
              "Active" is a claim about now, so a queued (or otherwise unconnected) server keeps quiet. */}
          {relayEnabled && status?.state === 'connected' && !!status?.relayUrl && (
            <p className="access-note">
              <Icon fa="fas fa-info-circle" hoverType={null} />
              {i18n['ra.drawer.relay.active'][lang]}
            </p>
          )}

          <List
            layout="compact"
            items={status ? connectionItem(status.state) : []}
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

          {/* Every gate here clears on Cardinal's side, so none of them offers a remedy to click */}
          {/* Queued needs no alert — the Connection row already says so; only a decline explains itself */}
          {status?.state === 'not_approved' && declined && (
            <Alert
              type="error"
              message={i18n['ra.declined.detail'][lang]}
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

      <Drawer.Section title={i18n['ra.cors.title'][lang]}>
        <Card padding="thin">
          <FormField
            className="cors-origins"
            labelFor="cors-origin-draft"
            error={originError ?? undefined}
          >
            {corsOrigins?.length
              ? <List
                  layout="compact"
                  items={corsOrigins.map((origin): ListItem => ({
                    id: origin.corsOriginId,
                    label: origin.origin,
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

      {!!nameToRelease && (
        <Confirm
          title={i18n['ra.vanity.confirm-release.title'][lang]}
          message={i18n['ra.vanity.confirm-release.desc'][lang]}
          confirmButtonIsDangerous={true}
          onClose={(confirmed) => {
            if (confirmed) {
              handleReleaseName()
            } else {
              setNameToRelease(null)
            }
          }}
        />
      )}

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
