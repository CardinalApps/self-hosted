import { useSelector } from 'react-redux'

import Drawer from '@cardinalapps/ui/src/components/layout/Drawer'

import UserInvitations from './InviteUser'
import InvitationLinks from './InviteLink'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { formatDate, formatTimeUntil } from '@cardinalapps/ui/src/lib/formatting/time'

import i18n from './i18n.json'

import './styles.css'

type ManageInvitationsDrawerProps = {
  onClose: () => void,
}

export type DrawIntitationTabType = {
  getExpiration: (date: Date, title?: boolean) => string,
}

function ManageInvitationsDrawer({ onClose }: ManageInvitationsDrawerProps) {
  const { lang } = useSelector(settingsSelectors.current)

  const getExpiration = (expiresAt, title = false) => {
    if (new Date(expiresAt).getTime() < Date.now()) {
      return i18n['users.invite.expired'][lang]
    } else {
      if (title) {
        return i18n['users.invite.expires-at'][lang] + ' ' + formatDate(expiresAt.toString())
      } else {
        return i18n['users.invite.expires-in'][lang] + ' ' + formatTimeUntil(expiresAt.toString())
      }
    }
  }

  return (
    <Drawer
      className="manage-invitations"
      onClose={onClose}
      title={i18n['users.invite-links.manage-title'][lang]}
    >
      <Drawer.Tabs
        labels={[
          i18n['users.invite-links.tabs.by-username'][lang],
          i18n['users.invite-links.tabs.by-link'][lang],
        ]}
      >
        <Drawer.Tab index={0}>
          <UserInvitations
            getExpiration={getExpiration}
          />
        </Drawer.Tab>

        <Drawer.Tab index={1}>
          <InvitationLinks
            getExpiration={getExpiration}
          />
        </Drawer.Tab>
      </Drawer.Tabs>
    </Drawer>
  )
}

export default ManageInvitationsDrawer
