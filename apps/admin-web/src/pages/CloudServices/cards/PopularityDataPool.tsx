import { useState } from 'react'
import { useSelector } from 'react-redux'

import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import P from '@cardinalapps/ui/src/components/typography/P'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import WrittenText from '@cardinalapps/ui/src/components/typography/WrittenText'
import ToggleSwitch from '@cardinalapps/ui/src/components/forms/ToggleSwitch'
import Confirm from '@cardinalapps/ui/src/components/interaction/Confirm'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import set from '@cardinalapps/ui/src/store/slices/settings/thunks/set'
import { cloudUserSelectors } from '@cardinalapps/ui/src/store/slices/cloudUser'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import useHasCapability from '@cardinalapps/ui/src/hooks/useHasCapability'
import { CardinalApp } from '@cardinalapps/ui/src/lib/env/cardinal'

import List from '@cardinalapps/ui/src/components/interaction/List'
import { useGetPopularityStatsQuery } from '@cardinalapps/ui/src/store/apis/popularity'

import { ENABLE_POPULARITY_DATA_POOL_SLUG } from '@cardinalapps/app-settings/src/admin/enable_popularity_data_pool'

import i18n from '../i18n.json'

const ENABLE_REQUIRES_SUBSCRIPTION = false

// Card for the Popularity Data Pool cloud service
function PopularityDataPool() {
  const dispatch = useAppDispatch()
  const settings = useSelector(settingsSelectors.current)
  const { lang } = settings
  const cloudLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const canUpdate = useHasCapability('ServerSettings.Update')

  const enabled = settings[ENABLE_POPULARITY_DATA_POOL_SLUG] === true
  const [showConfirmDisable, setShowConfirmDisable] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: stats } = useGetPopularityStatsQuery(undefined, { skip: !canUpdate })

  const criteriaNotice = ENABLE_REQUIRES_SUBSCRIPTION
    ? i18n['cloud-service.criteria.subscribed'][lang]
    : i18n['cloud-service.criteria.free'][lang]

  // Saves the toggle server-wide; the thunk itself toasts on failure
  const save = async (value: boolean) => {
    setSaving(true)
    await dispatch(set({
      settings: { [ENABLE_POPULARITY_DATA_POOL_SLUG]: value },
      app: CardinalApp.ADMIN,
    }))
    setSaving(false)
    setShowConfirmDisable(false)
  }

  const handleChange = (value: boolean) => {
    if (value) {
      save(true)
    } else {
      setShowConfirmDisable(true)
    }
  }

  return (
    <CardGrid.Card
      size="m"
      className="cloud-service-card"
      icon={<Icon fa="fas fa-fire" />}
      header={
        <H5>{i18n['pdp.title'][lang]}</H5>
      }
      headerRight={
        <ToggleSwitch
          name="enable-popularity-data-pool"
          value={enabled}
          onChange={handleChange}
          disabled={!cloudLoggedIn || !canUpdate}
        />
      }
      footer={enabled ? undefined : criteriaNotice}
    >
      <WrittenText>
        <P>{i18n['pdp.desc-1'][lang]}</P>
        <P>{i18n['pdp.desc-2'][lang]}</P>
      </WrittenText>

      {!!stats && (
        <List
          layout="compact"
          items={[
            {
              name: i18n['pdp.plays-contributed'][lang],
              label: String(stats.playsContributed),
            },
          ]}
        />
      )}

      {showConfirmDisable && (
        <Confirm
          title={i18n['pdp.confirm-disable.title'][lang]}
          message={i18n['pdp.confirm-disable.desc'][lang]}
          loading={saving}
          confirmButtonIsDangerous={true}
          onClose={(confirmed) => {
            if (confirmed) {
              save(false)
            } else {
              setShowConfirmDisable(false)
            }
          }}
        />
      )}
    </CardGrid.Card>
  )
}

export default PopularityDataPool
