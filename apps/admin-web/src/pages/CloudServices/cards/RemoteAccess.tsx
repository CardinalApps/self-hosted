import { useState } from 'react'
import { useSelector } from 'react-redux'

import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import ToggleSwitch from '@cardinalapps/ui/src/components/forms/ToggleSwitch'
import Confirm from '@cardinalapps/ui/src/components/interaction/Confirm'
import List from '@cardinalapps/ui/src/components/interaction/List'
import type { ListItem } from '@cardinalapps/ui/src/components/interaction/List/List'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import set from '@cardinalapps/ui/src/store/slices/settings/thunks/set'
import sync from '@cardinalapps/ui/src/store/slices/settings/thunks/sync'
import { cloudUserSelectors } from '@cardinalapps/ui/src/store/slices/cloudUser'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import useHasCapability from '@cardinalapps/ui/src/hooks/useHasCapability'
import { CardinalApp } from '@cardinalapps/ui/src/lib/env/cardinal'

import {
  useGetConnectStatusQuery,
  useEnableRemoteAccessMutation,
  useDisableRemoteAccessMutation,
} from '@cardinalapps/ui/src/store/apis/remoteAccess'

import { ENABLE_REMOTE_ACCESS_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access'
import { ENABLE_REMOTE_ACCESS_DIRECT_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access_direct'
import { ENABLE_REMOTE_ACCESS_RELAY_SLUG } from '@cardinalapps/app-settings/src/admin/enable_remote_access_relay'

import i18n from '../i18n.json'

const STATUS_POLL_MS = 5000

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

// Card for the Remote Access cloud service
function RemoteAccess() {
  const dispatch = useAppDispatch()
  const settings = useSelector(settingsSelectors.current)
  const { lang } = settings
  const cloudLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const canUpdate = useHasCapability('ServerSettings.Update')

  /* Only the hostname and URLs come from here. The switches read the settings slice, which is
     seeded and persisted client-side, so they paint in the right position instead of flipping. */
  const { data: status } = useGetConnectStatusQuery(undefined, {
    skip: !canUpdate,
    pollingInterval: STATUS_POLL_MS,
  })

  const [enableRemoteAccess] = useEnableRemoteAccessMutation()
  const [disableRemoteAccess] = useDisableRemoteAccessMutation()

  const [showRequestAccess, setShowRequestAccess] = useState(false)
  const [showConfirmDisable, setShowConfirmDisable] = useState(false)
  const [saving, setSaving] = useState(false)

  const enabled = settings[ENABLE_REMOTE_ACCESS_SLUG] === true
  const directEnabled = enabled && settings[ENABLE_REMOTE_ACCESS_DIRECT_SLUG] === true
  const relayEnabled = enabled && settings[ENABLE_REMOTE_ACCESS_RELAY_SLUG] === true

  /* Enabling mints a cloud credential, so it goes through the connect endpoint rather than a
     settings write. The Media Server owns the setting; pull it back once the call lands. */
  const setRemoteAccess = async (value: boolean) => {
    setSaving(true)
    await (value ? enableRemoteAccess() : disableRemoteAccess())
    await dispatch(sync(CardinalApp.ADMIN))
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
      footer={enabled ? undefined : i18n['cloud-service.criteria.free'][lang]}
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
            label: (
              <ToggleSwitch
                name="enable-direct-connections"
                value={directEnabled}
                disabled={!enabled || !canUpdate}
                onChange={(value) => setPath(ENABLE_REMOTE_ACCESS_DIRECT_SLUG, value)}
              />
            ),
          },
          ...urlItem('direct-url', directEnabled ? status?.directUrl : null),
          {
            value: 'relay',
            name: i18n['ra.relay.label'][lang],
            label: (
              <ToggleSwitch
                name="enable-relay-connections"
                value={relayEnabled}
                disabled={!enabled || !canUpdate}
                onChange={(value) => setPath(ENABLE_REMOTE_ACCESS_RELAY_SLUG, value)}
              />
            ),
          },
          ...urlItem('relay-url', relayEnabled ? status?.relayUrl : null),
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
    </CardGrid.Card>
  )
}

export default RemoteAccess
