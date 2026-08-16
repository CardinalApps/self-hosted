import { useState } from 'react'
import type { ReactNode } from 'react'
import { useSelector } from 'react-redux'

import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import ToggleSwitch from '@cardinalapps/ui/src/components/forms/ToggleSwitch'
import Alert from '@cardinalapps/ui/src/components/interaction/Alert'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Confirm from '@cardinalapps/ui/src/components/interaction/Confirm'
import List from '@cardinalapps/ui/src/components/interaction/List'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import set from '@cardinalapps/ui/src/store/slices/settings/thunks/set'
import sync from '@cardinalapps/ui/src/store/slices/settings/thunks/sync'
import { cloudUserSelectors } from '@cardinalapps/ui/src/store/slices/cloudUser'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import useHasCapability from '@cardinalapps/ui/src/hooks/useHasCapability'
import useServiceAccess from '@cardinalapps/ui/src/hooks/useServiceAccess'
import { CardinalApp } from '@cardinalapps/ui/src/lib/env/cardinal'

import {
  REMOTE_ACCESS_DIRECT_FEATURE,
  REMOTE_ACCESS_FEATURE_SLUGS,
  REMOTE_ACCESS_RELAY_FEATURE,
  isQueuedForRemoteAccess,
  isServiceAccessRefusal,
  serviceAccessIndicator,
} from '@cardinalapps/ui/src/lib/auth/serviceAccess'

import {
  useEnableRemoteAccessMutation,
  useDisableRemoteAccessMutation,
} from '@cardinalapps/ui/src/store/apis/remoteAccess'

import { ENABLE_REMOTE_ACCESS_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access'
import { ENABLE_REMOTE_ACCESS_DIRECT_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access_direct'
import { ENABLE_REMOTE_ACCESS_RELAY_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access_relay'

import ConfigureRemoteAccessDrawer from '../ConfigureRemoteAccessDrawer'

import i18n from '../i18n.json'

const ACCESS_ICONS = {
  loading: 'fas fa-circle-notch fa-spin',
  granted: 'fas fa-check-circle',
  queued: 'fas fa-hourglass-half',
} as const

const ACCESS_TITLES = {
  loading: 'ra.access.checking',
  granted: 'ra.access.granted',
  queued: 'ra.access.queued',
} as const

// Card for the Remote Access cloud service
function RemoteAccess() {
  const dispatch = useAppDispatch()
  const settings = useSelector(settingsSelectors.current)
  const { lang } = settings
  const cloudLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const canUpdate = useHasCapability('ServerSettings.Update')

  const [enableRemoteAccess] = useEnableRemoteAccessMutation()
  const [disableRemoteAccess] = useDisableRemoteAccessMutation()

  const { features, refresh, retract } = useServiceAccess({ skip: !cloudLoggedIn })

  const [showRequestAccess, setShowRequestAccess] = useState(false)
  const [showConfirmDisable, setShowConfirmDisable] = useState(false)
  const [showConfigure, setShowConfigure] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refused, setRefused] = useState(false)

  const enabled = settings[ENABLE_REMOTE_ACCESS_SLUG] === true
  const directEnabled = enabled && settings[ENABLE_REMOTE_ACCESS_DIRECT_SLUG] === true
  const relayEnabled = enabled && settings[ENABLE_REMOTE_ACCESS_RELAY_SLUG] === true

  const queued = !enabled && (refused || isQueuedForRemoteAccess(features))

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

  const setPath = (slug: string, value: boolean) => {
    dispatch(set({
      settings: { [slug]: value },
      app: CardinalApp.ADMIN,
    }))
  }

  const handleChange = (value: boolean) => {
    if (value) {
      setShowRequestAccess(true)
    } else {
      setShowConfirmDisable(true)
    }
  }

  /* The user owns the path toggles; this only reports what Cardinal has granted the account. There
     is nothing to report until Remote Access is on and there is a cloud account to report about. */
  const pathControl = (slug: string, toggle: ReactNode) => {
    if (!enabled || !cloudLoggedIn) {
      return toggle
    }

    const indicator = serviceAccessIndicator(features, slug)

    return (
      <span className="path-control">
        <span className="path-access" data-access={indicator}>
          <Icon fa={ACCESS_ICONS[indicator]} title={i18n[ACCESS_TITLES[indicator]][lang]} hoverType={null} />
        </span>
        {toggle}
      </span>
    )
  }

  return (
    <CardGrid.Card
      size="m"
      className="cloud-service-card"
      icon={<Icon fa="fas fa-globe" />}
      header={
        <H5>{i18n['ra.title'][lang]}</H5>
      }
      headerRight={
        <ToggleSwitch
          name="enable-remote-access"
          value={enabled}
          onChange={handleChange}
          disabled={!cloudLoggedIn || !canUpdate}
        />
      }
      footer={enabled
        ? (
          <Button type="button" onClick={() => setShowConfigure(true)}>
            {i18n['ra.configure'][lang]}
          </Button>
        )
        : i18n['cloud-service.criteria.free'][lang]
      }
    >
      <div className="description">
        <p>{i18n['ra.desc'][lang]}</p>
      </div>

      <List
        className="remote-access-paths"
        layout="compact"
        items={[
          {
            value: 'direct',
            name: i18n['ra.direct.label'][lang],
            label: pathControl(REMOTE_ACCESS_DIRECT_FEATURE, (
              <ToggleSwitch
                name="enable-direct-connections"
                value={directEnabled}
                disabled={!enabled || !canUpdate}
                onChange={(value) => setPath(ENABLE_REMOTE_ACCESS_DIRECT_SLUG, value)}
              />
            )),
          },
          {
            value: 'relay',
            name: i18n['ra.relay.label'][lang],
            label: pathControl(REMOTE_ACCESS_RELAY_FEATURE, (
              <ToggleSwitch
                name="enable-relay-connections"
                value={relayEnabled}
                disabled={!enabled || !canUpdate}
                onChange={(value) => setPath(ENABLE_REMOTE_ACCESS_RELAY_SLUG, value)}
              />
            )),
          },
        ]}
      />

      {queued && (
        <Alert
          type="info"
          message={i18n['ra.queued.desc'][lang]}
        />
      )}

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
