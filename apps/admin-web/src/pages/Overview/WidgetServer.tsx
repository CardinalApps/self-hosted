import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'

import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import List from '@cardinalapps/ui/src/components/interaction/List'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'
import Button from '@cardinalapps/ui/src/components/interaction/Button'

import { useGetReleaseChannelQuery, useGetVersionsQuery, useLazyGetUpdatesQuery } from '@cardinalapps/ui/src/store/apis/versions'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { useGetLicensingSubscriptionQuery } from '@cardinalapps/ui/src/store/apis/licensing'
import { useGetInstanceQuery } from '@cardinalapps/ui/src/store/apis/instance'

import i18n from './i18n.json'
import './styles.css'
import { homeServerSelectors } from '@cardinalapps/ui/src/store/slices/homeServer'

function WidgetServer() {
  const dispatch = useAppDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const serverName = useSelector(homeServerSelectors.serverName)
  const instanceId = useSelector(homeServerSelectors.instanceId)

  const versionsQuery = useGetVersionsQuery({})
  const { data: versionsData = {} } = versionsQuery

  const releaseChannelsQuery = useGetReleaseChannelQuery({})
  const { data: releaseChannelsData = {} } = releaseChannelsQuery

  const subscriptionQuery = useGetLicensingSubscriptionQuery({})
  const { data: subscriptionData = {} } = subscriptionQuery

  const instanceQuery = useGetInstanceQuery()
  const { data: instanceData } = instanceQuery

  const [getUpdates, getUpdatesResult] = useLazyGetUpdatesQuery()

  const manuallyCheckForUpdates = () => {
    if (releaseChannelsData?.current === 'development') {
      dispatch(toastActions.addToQueue({
        title: i18n['server.no-updates-on-dev'][lang],
        type: 'warning',
        ttl: 8000,
      }))
    } else {
      getUpdates({})
    }
  }

  useEffect(() => {
    if (getUpdatesResult.isSuccess) {
      if (getUpdatesResult.data?.updateIsAvailable) {
        dispatch(toastActions.addToQueue({
          title: i18n['server.update-is-available'][lang],
          body: i18n['server.update-is-available.links'][lang].replaceAll('{version}', getUpdatesResult.data?.latestVersion),
        }))
      } else if (getUpdatesResult.data?.updateIsAvailable === false) {
        dispatch(toastActions.addToQueue({
          title: i18n['server.no-update-available.title'][lang],
          body: i18n['server.no-update-available.body'][lang],
          ttl: 8000,
        }))
      }
    }
  }, [getUpdatesResult.isSuccess, getUpdatesResult.requestId])

  return (
    <CardGrid.Card
      size="m"
      icon={<Icon fa="fas fa-server" />}
      header={
        <>
          <H5>{i18n['server.title'][lang]}</H5>
        </>
      }
      footer={
        <>
          <Button
            animation={getUpdatesResult.isLoading ? 'loading' : undefined}
            onClick={() => manuallyCheckForUpdates()}
          >
            {i18n['server.check-for-updates'][lang]}
          </Button>
        </>
      }
    >
      <div className={'server-info'}>
        <List
          className="server-info-list"
          layout="compact"
          items={[
            {
              name: i18n['server.server-name'][lang],
              label: instanceData?.serverName,
              truncateLabel: true,
              title: instanceData?.serverName,
            },
            {
              name: i18n['server.subscription'][lang],
              label: subscriptionData?.name?.[lang],
            },
            {
              name: i18n['server.release-channel'][lang],
              label: <span style={{ textTransform: 'capitalize' }}>{releaseChannelsData?.current}</span>,
            },
            {
              name: i18n['server.version'][lang],
              label: `v${versionsData?.cardinal_home_server}`,
            },
            {
              name: i18n['server.build'][lang],
              label: versionsData?.build_tag || i18n['server.build.untagged']['en'],
              truncateLabel: true,
            },
            {
              name: i18n['server.instance-id'][lang],
              label: instanceData?.instanceId,
              truncateLabel: true,
              title: instanceData?.instanceId,
            },
          ]}
        />
      </div>
    </CardGrid.Card>
  )
}

export default WidgetServer
