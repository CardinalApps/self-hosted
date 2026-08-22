import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import ToggleSwitch from '@cardinalapps/ui/src/components/forms/ToggleSwitch'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Confirm from '@cardinalapps/ui/src/components/interaction/Confirm'
import List from '@cardinalapps/ui/src/components/interaction/List'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import sync from '@cardinalapps/ui/src/store/slices/settings/thunks/sync'
import { cloudUserSelectors } from '@cardinalapps/ui/src/store/slices/cloudUser'
import { SubscriptionTierSlug } from '@cardinalapps/products/src/subscriptions'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import useHasCapability from '@cardinalapps/ui/src/hooks/useHasCapability'
import useServiceAccess from '@cardinalapps/ui/src/hooks/useServiceAccess'
import { CardinalApp } from '@cardinalapps/ui/src/lib/env/cardinal'
import { homeServerUserSelectors } from '@cardinalapps/ui/src/store/slices/homeServerUser'

import {
  REMOTE_ACCESS_FEATURE_SLUGS,
  isServiceAccessRefusal,
  serviceAccessIndicator,
} from '@cardinalapps/ui/src/lib/auth/serviceAccess'
import type { ServiceAccessIndicator } from '@cardinalapps/ui/src/lib/auth/serviceAccess'

import {
  connectUrls,
  useEnableRemoteAccessMutation,
  useDisableRemoteAccessMutation,
  useGetConnectStatusQuery,
} from '@cardinalapps/ui/src/store/apis/remoteAccess'
import type { ConnectionState } from '@cardinalapps/ui/src/store/apis/remoteAccess'

import { ENABLE_REMOTE_ACCESS_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access'
import { ENABLE_REMOTE_ACCESS_DIRECT_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access_direct'

import ReloadButton from '../../../components/ReloadButton'

import ConfigureRemoteAccessDrawer, { connectionStateLabel } from '../ConfigureRemoteAccessDrawer'

import i18n from '../i18n.json'

// What a row reports when there is no settled answer to give, rather than a guess
const NO_VALUE = '-'

const ENABLE_REQUIRES_SUBSCRIPTION = true

const STATUS_POLL_MS = 20000

// The grants live in the cloud rather than on the LAN, so they are read a third as often
const GRANTS_POLL_MS = 60000

// Card for the Remote Access cloud service
function RemoteAccess() {
  const dispatch = useAppDispatch()
  const settings = useSelector(settingsSelectors.current)
  const { lang } = settings
  const cloudLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const cloudUser = useSelector(cloudUserSelectors.current)
  /* `loggedIn` only settles once a session check runs, so a pure local-IDP session sits at null
     forever. Whether this local user is cloud-linked is canonically their `cardinalId`. */
  const localUser = useSelector(homeServerUserSelectors.current)
  const cloudSignedOut = cloudLoggedIn === false || (cloudLoggedIn === null && !localUser?.cardinalId)
  const canUpdate = useHasCapability('ServerSettings.Update')

  const [enableRemoteAccess] = useEnableRemoteAccessMutation()
  const [disableRemoteAccess] = useDisableRemoteAccessMutation()

  const { features, error: accessUnreadable, refresh, retract } = useServiceAccess({ skip: !cloudLoggedIn })

  const [showRequestAccess, setShowRequestAccess] = useState(false)
  const [showConfirmDisable, setShowConfirmDisable] = useState(false)
  const [showConfigure, setShowConfigure] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refused, setRefused] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const enabled = settings[ENABLE_REMOTE_ACCESS_SLUG] === true

  /* Every access claim the card makes comes through here, so a row's icon and the note above it
     can never describe different states. The Media Server records a refused enable as an enable,
     so a refusal this session is the queue entry the next grants read has yet to catch up with. */
  const pathIndicator = (slug: string): ServiceAccessIndicator => {
    const indicator = serviceAccessIndicator(features, slug)

    return refused && indicator === 'unavailable' ? 'queued' : indicator
  }

  const queued = REMOTE_ACCESS_FEATURE_SLUGS.some((slug) => pathIndicator(slug) === 'queued')

  /* An opened gate still counts as access once Remote Access outgrows the beta. A suspension
     leaves the grant approved on purpose: the drawer is where a suspended account reads why. */
  const approved = REMOTE_ACCESS_FEATURE_SLUGS.some((slug) => pathIndicator(slug) === 'granted')

  /* A decision, not a gap. The auth server leaves a denied grant untouched when a request is filed
     over it, so re-asking would be a silent no-op the card would keep repeating. */
  const declined = REMOTE_ACCESS_FEATURE_SLUGS.some((slug) => pathIndicator(slug) === 'denied')

  /* Settings that say Remote Access is on while Cardinal has granted nothing — either a refusal or
     the state a stale localStorage leaves behind. An unreadable cloud is not an answer. */
  const unavailable = enabled && !accessUnreadable
    && REMOTE_ACCESS_FEATURE_SLUGS.every((slug) => ['unavailable', 'denied'].includes(pathIndicator(slug)))

  /* An unreachable cloud IDP leaves the card holding no answer, but only for a session that could
     have gotten one — a signed-out session has nothing to read and gets no note at all. */
  const unknownAccess = enabled && !cloudSignedOut && accessUnreadable

  const grantStatus = (slug: string) => features?.find((feature) => feature.slug === slug)?.status ?? 'missing'

  /* Approvals and lifted suspensions are decided on Cardinal's side and picked up by the Media
     Server on its own retry schedule, so the only way this card hears about one is by watching.
     Display data only — the switches keep reading the settings slice. */
  const { data: status, refetch: refetchStatus, isUninitialized } = useGetConnectStatusQuery(undefined, {
    skip: !canUpdate || !(enabled || queued),
    pollingInterval: STATUS_POLL_MS,
    refetchOnFocus: true,
  })

  const connectionState = status?.state ?? null
  const lastConnectionState = useRef<ConnectionState | null>(null)

  // Re-read everything the card paints from whenever the Media Server's connection changes under it
  useEffect(() => {
    const previous = lastConnectionState.current
    lastConnectionState.current = connectionState

    if (!connectionState || !previous || previous === connectionState) {
      return
    }

    // A live connection is proof the refused enable has since been granted, so the wait can end
    if (connectionState === 'connected') {
      setRefused(false)
    }

    void dispatch(sync(CardinalApp.ADMIN))
    void refresh()
  }, [connectionState, dispatch, refresh])

  /* Leaving the switch on IS the request, so a server whose grant went missing or was retracted
     files one itself instead of sitting there switched on and disconnected. Keyed on the grants it
     saw, so it files once per answer rather than once per poll; a real failure clears the key and
     the next grants read may try again. A refusal is not a failure — it is the queue entry. */
  const autoFiledFor = useRef<string | null>(null)
  const autoFileKey = REMOTE_ACCESS_FEATURE_SLUGS.map(grantStatus).join('|')
  const shouldAutoFile = unavailable && !declined && !saving && canUpdate && cloudLoggedIn

  useEffect(() => {
    if (!shouldAutoFile || autoFiledFor.current === autoFileKey) {
      return
    }

    autoFiledFor.current = autoFileKey

    void (async () => {
      try {
        await enableRemoteAccess().unwrap()
        setRefused(false)
      } catch (error) {
        if (isServiceAccessRefusal(error)) {
          setRefused(true)
        } else {
          autoFiledFor.current = null
          return
        }
      }

      await dispatch(sync(CardinalApp.ADMIN))
      await refresh()
    })()
    // `features` is a dep so a cleared key gets its retry on the next grants read, not sooner
  }, [shouldAutoFile, autoFileKey, features, enableRemoteAccess, dispatch, refresh])

  /* Cardinal can decide the grant long before the Media Server's own retry proves it, so the wait
     states re-read it on their own rather than sitting on a stale answer until the next reload. */
  useEffect(() => {
    if (!cloudLoggedIn || !(enabled || queued)) {
      return
    }

    const id = setInterval(() => { void refresh() }, GRANTS_POLL_MS)

    return () => clearInterval(id)
  }, [cloudLoggedIn, enabled, queued, refresh])

  /* Every source the card paints from, re-read together so none of them can be the stale one.
     Refetching a query that never started throws, so the query's own flag decides. The connection
     row watches this rather than the query's own fetching flag, which the poll keeps flipping. */
  const reload = () => {
    setRefreshing(true)

    return Promise.all([
      isUninitialized ? Promise.resolve() : refetchStatus(),
      refresh(),
      dispatch(sync(CardinalApp.ADMIN)),
    ]).finally(() => setRefreshing(false))
  }

  /* The notice is a login prompt, so an account that already meets the bar shouldn't see it —
     including while the feature is off. */
  const meetsCriteria = cloudLoggedIn === true
    && (!ENABLE_REQUIRES_SUBSCRIPTION
      || (!!cloudUser.subscription && cloudUser.subscription !== SubscriptionTierSlug.FREE))
  const criteriaNotice = meetsCriteria
    ? undefined
    : ENABLE_REQUIRES_SUBSCRIPTION
      ? i18n['cloud-service.criteria.subscribed'][lang]
      : i18n['cloud-service.criteria.free'][lang]

  /* Enabling mints a cloud credential, so it goes through the connect endpoint rather than a
     settings write. The Media Server owns the setting; pull it back once the call lands. */
  const setRemoteAccess = async (value: boolean) => {
    setSaving(true)

    if (value) {
      /* A refusal is itself the queue entry — the cloud files the request while turning the
         attempt down — so it reports as a wait rather than as a failure. */
      try {
        await enableRemoteAccess().unwrap()
        setRefused(false)
      } catch (error) {
        setRefused(isServiceAccessRefusal(error))
      }
    } else {
      const disabled = await disableRemoteAccess().unwrap().then(() => true, () => false)

      if (disabled) {
        setRefused(false)
        await retract(REMOTE_ACCESS_FEATURE_SLUGS)
      }
    }

    await dispatch(sync(CardinalApp.ADMIN))
    await refresh()
    setSaving(false)
    setShowRequestAccess(false)
    setShowConfirmDisable(false)
  }

  const handleChange = (value: boolean) => {
    if (value) {
      setShowRequestAccess(true)
    } else {
      setShowConfirmDisable(true)
    }
  }

  /* One note at a time, so the card cannot claim a queue and an outage in the same breath. Proof
     first: a queue entry the card watched itself outranks anything read from grants, and a cloud
     the card could not read at all outranks a verdict it would be inventing. While Remote Access
     is on there is always something to say — silence would read as everything being fine. */
  const accessNote = (): { text: string, icon: string, failed?: boolean } | null => {
    if (queued) {
      return { text: i18n['ra.queued.desc'][lang], icon: 'fas fa-info-circle' }
    }

    if (unknownAccess) {
      return { text: i18n['ra.unknown.desc'][lang], icon: 'fas fa-question-circle' }
    }

    if (!unavailable) {
      return null
    }

    return declined
      ? { text: i18n['ra.declined.desc'][lang], icon: 'fas fa-exclamation-circle', failed: true }
      : { text: i18n['ra.unavailable.desc'][lang], icon: 'fas fa-info-circle' }
  }

  const note = accessNote()

  /* The address the outside world dials, taken from the connection itself: a live custom name has
     already replaced the assigned one there. Nothing is offered unless the server is answering on
     it, because a URL that does not resolve is worse than no URL at all. */
  const { assigned: assignedUrl, vanity: vanityUrl } = connectUrls(status, null)
  /* Direct off means the URL is refused by policy even while the relay keeps the server connected —
     a row this card asks users to trust cannot show an address that will not answer. */
  const directOn = settings[ENABLE_REMOTE_ACCESS_DIRECT_SLUG] === true
  const publicUrl = enabled && directOn && status?.state === 'connected' ? vanityUrl ?? assignedUrl : null

  return (
    <CardGrid.Card
      size="m"
      className="cloud-service-card"
      icon={<Icon fa="fas fa-satellite" />}
      header={
        <H5>{i18n['ra.title'][lang]}</H5>
      }
      headerRight={
        <span className="card-controls">
          <ReloadButton title={i18n['ra.reload'][lang]} onClick={reload} />
          <ToggleSwitch
            name="enable-remote-access"
            value={enabled}
            onChange={handleChange}
            disabled={!cloudLoggedIn || !canUpdate}
          />
        </span>
      }
      footer={enabled
        /* A local-IDP admin can already flip the per-path toggles, so a signed-out session still
           gets the drawer; only a cloud session awaiting approval has nothing to configure. */
        ? ((approved || cloudSignedOut) && (
          <Button type="button" onClick={() => setShowConfigure(true)}>
            {i18n['ra.configure'][lang]}
          </Button>
        ))
        : criteriaNotice
      }
    >
      <div className="description">
        <p>{i18n['ra.desc'][lang]}</p>
      </div>

      {note && (
        <p className={clsx('access-note', note.failed && 'failed')}>
          <Icon fa={note.icon} hoverType={null} />
          {note.text}
        </p>
      )}

      <List
        className="remote-access-status"
        layout="compact"
        items={[
          {
            value: 'connection-status',
            name: i18n['ra.connection.label'][lang],
            label: (
              <span className="status-value">
                {refreshing && <Icon fa="fas fa-circle-notch fa-spin" hoverType={null} />}
                {/* Off is a settled answer, and a cached state from before the flip must never outrank it */}
                {!enabled
                  ? i18n['ra.status.disabled'][lang]
                  : status ? connectionStateLabel(status.state, lang) : NO_VALUE}
              </span>
            ),
          },
          {
            value: 'public-url',
            name: i18n['ra.public-url.label'][lang],
            label: publicUrl ?? NO_VALUE,
            ...(publicUrl ? { title: publicUrl, copyable: publicUrl, controls: ['copy' as const], truncateLabel: true } : {}),
          },
        ]}
      />

      {showRequestAccess && (
        <Confirm
          title={i18n['ra.request-access.title'][lang]}
          message={(
            <>
              <p>{i18n['ra.request-access.desc-p1'][lang]}</p>
              <p>{i18n['ra.request-access.desc-p2'][lang]}</p>
            </>
          )}
          loading={saving}
          onClose={(confirmed) => {
            if (confirmed) {
              setRemoteAccess(true)
            } else {
              setShowRequestAccess(false)
            }
          }}
        />
      )}

      {showConfirmDisable && (
        <Confirm
          title={i18n['ra.confirm-disable.title'][lang]}
          message={i18n['ra.confirm-disable.desc'][lang]}
          loading={saving}
          confirmButtonIsDangerous={true}
          onClose={(confirmed) => {
            if (confirmed) {
              setRemoteAccess(false)
            } else {
              setShowConfirmDisable(false)
            }
          }}
        />
      )}

      {showConfigure && (
        <ConfigureRemoteAccessDrawer onClose={() => setShowConfigure(false)} />
      )}
    </CardGrid.Card>
  )
}

export default RemoteAccess
