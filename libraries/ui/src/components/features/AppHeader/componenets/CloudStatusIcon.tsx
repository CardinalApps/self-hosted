import { useSelector } from 'react-redux'

import { settingsSelectors } from '../../../../store/slices/settings'
import { homeServerUserSelectors } from '../../../../store/slices/homeServerUser'
import { cloudUserSelectors } from '../../../../store/slices/cloudUser'
import MenuButton from '../../../interaction/MenuButton'

import i18n from '../i18n'

const STATUS_DOTS = {
  connected: 'connected',
  loading: 'loading',
  not_connected: 'not-connected',
} as const

const CloudStatusIcon = () => {
  const mediaServerStatusLoading = useSelector(homeServerUserSelectors.loading)
  const mediaServerStatusConnected = useSelector(homeServerUserSelectors.loggedIn)
  const currentMediaServerUser = useSelector(homeServerUserSelectors.current)
  const cloudUserLoading = useSelector(cloudUserSelectors.loading)
  const cloudServicesConnected = useSelector(cloudUserSelectors.loggedIn)
  const { lang } = useSelector(settingsSelectors.current)

  const getMediaServerStatus = () => {
    if (mediaServerStatusConnected) {
      return STATUS_DOTS.connected
    }
    if (mediaServerStatusLoading) {
      return STATUS_DOTS.loading
    }
    return STATUS_DOTS.not_connected
  }

  const getCloudStatus = () => {
    if (cloudServicesConnected) {
      return STATUS_DOTS.connected
    }
    if (cloudUserLoading) {
      return STATUS_DOTS.loading
    }
    return STATUS_DOTS.not_connected
  }

  return (
    <MenuButton
      className="cloud-status-icon"
      solid={false}
      size="m"
      align={'right'}
      title={i18n['cloud-status-icon.title']['en']}
      icon={
        <div className="status-dots">
          <div
            className="status-dot"
            title={`${i18n['cloud-status-icon.cloud-services.title'][lang]}: ${currentMediaServerUser?.designation === 'guest_account' ? i18n['cloud-status-icon.guest-account'][lang] : i18n[`cloud-status-icon.dots.${getCloudStatus()}`][lang]}`}
            data-status={getCloudStatus()}
          />
          <div
            className="status-dot"
            title={`${i18n['cloud-status-icon.media-server.title'][lang]}: ${i18n[`cloud-status-icon.dots.${getMediaServerStatus()}`][lang]}`}
            data-status={getMediaServerStatus()}
          />
        </div>
      }
    >
      <MenuButton.Section className="current-status">
        <div className="server">
          <p className="server-name">
            <i className="fas fa-cloud" />
            {i18n['cloud-status-icon.cloud-services.title'][lang]}
          </p>
          <p className="realtime">
            {currentMediaServerUser?.designation === 'guest_account' ? i18n['cloud-status-icon.guest-account'][lang] : i18n[`cloud-status-icon.dots.${getCloudStatus()}`][lang]}
          </p>
        </div>
        <div className="server">
          <p className="server-name">
            <i className="fas fa-home" />
            {i18n['cloud-status-icon.media-server.title'][lang]}
          </p>
          <p className="realtime">
            {i18n[`cloud-status-icon.dots.${getMediaServerStatus()}`][lang]}
          </p>
        </div>
      </MenuButton.Section>
      <MenuButton.Section
        className="status-overview"
        title={i18n['cloud-status-icon.dots.legend'][lang]}
      >
        <ul className="dot-legend">
          <li>
            <div className="status-dot" data-status={STATUS_DOTS.connected} />
            <span>{i18n['cloud-status-icon.dots.connected'][lang]}</span>
          </li>
          <li>
            <div className="status-dot" data-status={STATUS_DOTS.loading} />
            <span>{i18n['cloud-status-icon.dots.loading'][lang]}</span>
          </li>
          <li>
            <div className="status-dot" data-status={STATUS_DOTS.not_connected} />
            <span>{i18n['cloud-status-icon.dots.not-connected'][lang]}</span>
          </li>
        </ul>
      </MenuButton.Section>
    </MenuButton>
  )
}

export default CloudStatusIcon
