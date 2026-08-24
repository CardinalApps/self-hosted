import { useSelector } from 'react-redux'
import { ACi18n } from '@cardinalapps/access-control/src'

import Alert from '@cardinalapps/ui/src/components/interaction/Alert'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import UserTag from '@cardinalapps/ui/src/components/interaction/UserTag'
import Drawer from '@cardinalapps/ui/src/components/layout/Drawer'
import List from '@cardinalapps/ui/src/components/interaction/List'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { UserType } from '@cardinalapps/ui/src/types/user'
import { formatDate, formatTimeAgo } from '@cardinalapps/ui/src/lib/formatting/time'
import { homeServerUserSelectors } from '@cardinalapps/ui/src/store/slices/homeServerUser'

import EnableDisable from './EnableDisable'

import i18n from './i18n.json'
import './styles.css'
import UpdatePassword from './UpdatePassword'

type UserManagementDrawerProps = {
  user: UserType,
  onClose: () => void,
}

function UserManagementDrawer({ user, onClose }: UserManagementDrawerProps) {
  const { lang } = useSelector(settingsSelectors.current)
  const currentUser = useSelector(homeServerUserSelectors.current)
  const isGuestAccount = user?.designation === 'guest_account'
  const isCurrentUser = user?.userId === currentUser.userId
  const isCloudUser = user?.cardinalId
  const isServerOwner = user?.roles.find((role) => role.role === 'owner')
  const hasPassword = !user.cardinalId && user.designation !== 'guest_account'

  const removeUserButton = () => {
    if (isGuestAccount) {
      return (
        <Button
          disabled={true}
          title={i18n['users.settings.actions.remove.disabled-for-guest'][lang]}
          icon="fas fa-trash"
        >
          {i18n['users.settings.actions.remove'][lang]}
        </Button>
      )
    } else if (isServerOwner) {
      return (
        <Button
          disabled={true}
          title={i18n['users.settings.actions.remove.disabled-for-owner'][lang]}
          icon="fas fa-trash"
        >
          {i18n['users.settings.actions.remove'][lang]}
        </Button>
      )
    }
  }

  return (
    <Drawer
      className="manage-user-drawer"
      onClose={onClose}
    >
      <Drawer.Section>
        <UserTag showAvatar={true} size='l' user={user} />
      </Drawer.Section>
      {isCurrentUser && isCloudUser && (
        <Drawer.Section>
          <div>
            <Button href="https://account.cardinalapps.io" arrowText={true} target='_blank'>
              {i18n['users.settings.actions.cloud-portal-link'][lang]}
            </Button>
          </div>
        </Drawer.Section>
      )}
      {isGuestAccount && (
        <Drawer.Section>
          <Alert
            type="info"
            message={i18n['users.settings.alert.guest-account-info'][lang]}
          />
        </Drawer.Section>
      )}
      <Drawer.Section>
        <List
          layout="compact"
          items={[
            {
              label: i18n['users.settings.info.last-seen'][lang],
              value: user?.activityStatusUpdatedAt
                ? `${formatDate(user?.activityStatusUpdatedAt)} (${formatTimeAgo(user?.activityStatusUpdatedAt, lang)})`
                : i18n['users.settings.info.last-seen.never'][lang],
            },
            {
              label: i18n['users.settings.info.type'][lang],
              value: isCloudUser? i18n['users.settings.info.type.cloud'][lang] : i18n['users.settings.info.type.local'][lang],
            },
            {
              label: i18n['users.settings.info.enabled'][lang],
              value: user?.enabled
                ? i18n['users.settings.info.enabled.yes'][lang]
                : i18n['users.settings.info.enabled.no'][lang],
            },
            {
              label: i18n['users.settings.info.id'][lang],
              value: user.userId,
            },
          ]}
        />
      </Drawer.Section>
      <Drawer.Section title={i18n['users.settings.roles'][lang]} capabilities={['RoleAssignments.Read']}>
        <List
          maxHeight={220}
          items={user?.roles?.map((roleAssignment) => {
            return {
              label: ACi18n?.[`role.${roleAssignment.role}.name`]?.[lang],
            }
          })}
        />
      </Drawer.Section>
      <Drawer.Section className="user-actions" title={i18n['users.settings.actions'][lang]}>
        {hasPassword && <UpdatePassword user={user} />}
        <EnableDisable user={user} />
        {removeUserButton()}
      </Drawer.Section>
    </Drawer>
  )
}

export default UserManagementDrawer
