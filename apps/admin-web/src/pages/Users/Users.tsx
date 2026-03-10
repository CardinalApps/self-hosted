import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { ACi18n } from '@cardinalapps/access-control/src'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Table from '@cardinalapps/ui/src/components/interaction/Table'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import UserTag from '@cardinalapps/ui/src/components/interaction/UserTag'
//import { Subscriptions } from '@cardinalapps/products/src'

import useHasCapability from '@cardinalapps/ui/src/hooks/useHasCapability'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { useGetUsersQuery } from '@cardinalapps/ui/src/store/apis/homeServerUsers'
import { UserType } from '@cardinalapps/ui/src/types/user'
import { formatDate, formatTimeAgo } from '@cardinalapps/ui/src/lib/formatting/time'
import { homeServerUserSelectors } from '@cardinalapps/ui/src/store/slices/homeServerUser'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import { pluralize } from '@cardinalapps/ui/src/lib/formatting/text'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'
import { useGetInvitationsQuery } from '@cardinalapps/ui/src/store/apis/invitations'
import { useGetLicensingSeatsQuery } from '@cardinalapps/ui/src/store/apis/licensing'
import { useGetActiveUsersQuery } from '@cardinalapps/ui/src/store/apis/activeUsers'

import ManageInvitationsDrawer from './ManageInvitationsDrawer'
import UserManagementDrawer from './UserManagementDrawer'
import CreateUserDrawer from './CreateUserDrawer'

import i18n from './i18n.json'
import './styles.css'

function Users() {
  const { lang } = useSelector(settingsSelectors.current)
  const currentUser = useSelector(homeServerUserSelectors.current)
  const canUserCreateInvitiations = useHasCapability('Invitations.Create')
  const canUserCreateUsers = useHasCapability('Users.Create')
  const [configuringUser, setConfiguringUser] = useState<UserType>()
  const [showManageInvitationsDrawer, setShowManageInvitationsDrawer] = useState<boolean>(false)
  const [showCreateUserDrawer, setShowCreateUserDrawer] = useState<boolean>(false)

  const serverOwnerRes = useGetActiveUsersQuery({})
  const serverOwner = serverOwnerRes.data?.[0]

  const usersRes = useGetUsersQuery({ take: 9999, roles: true })
  const users = usersRes?.data ? usersRes.data?.[0] : []
  const serverIsClaimed = !!serverOwner

  const licensingSeatsRes = useGetLicensingSeatsQuery({})
  const licensingSeats = licensingSeatsRes?.data

  const activeInvitationsRes = useGetInvitationsQuery({ isExpired: false })
  const activeIntiations = activeInvitationsRes?.data?.[0] || []

  const totalLocalUsers = users.filter((user) => !user.cardinalId).length

  const nameCol = (user: UserType) => {
    return (
      <Table.Col key="username">
        <div className="user-name">
          <UserTag size='s' user={user} />
          {user?.userId === currentUser?.userId &&
            <Icon fa="fas fa-fingerprint" className="current-user-badge" title={i18n['users.table.current-user-icon-title'][lang]} />
          }
        </div>
      </Table.Col>
    )
  }

  const typeCol = (user: UserType) => {
    return (
      <Table.Col key="type">
        <span className="capitalize">
          {user.cardinalId
            ? i18n['users.settings.info.type.cloud'][lang]
            : i18n['users.settings.info.type.local'][lang]
          }
        </span>
      </Table.Col>
    )
  }

  const roleCol = (user: UserType) => {
    return (
      <Table.Col key="role">
        <span className="capitalize">
          {user?.roles.length === 1
            ? ACi18n[`role.${user?.roles?.[0]?.role}.name`]?.[lang]
            : i18n['users.roles.count'][lang].replace('{num}', user?.roles.length)
          }
        </span>
      </Table.Col>
    )
  }

  const enabledStatusCol = (user: UserType) => {
    if (user?.enabled) {
      return (
        <Table.Col key="status">
          <div className="user-activation-status activated">
            <Icon fa="fas fa-check-circle" />
            <span>{i18n['users.guest.enabled'][lang]}</span>
          </div>
        </Table.Col>
      )
    } else {
      return (
        <Table.Col key="status">
          <div className="user-activation-status deactivated">
            <Icon fa="fas fa-ban" />
            <span>{i18n['users.guest.disabled'][lang]}</span>
          </div>
        </Table.Col>
      )
    }
  }

  const lastSeenCol = (lastSeen) => {
    return (
      <Table.Col key="last-seen">
        {lastSeen
          ? (
            <span title={formatDate(lastSeen)}>
              {formatTimeAgo(lastSeen)}
            </span>
            )
          : null
        }
      </Table.Col>
    )
  }

  const controlsCol = (user) => {
    return (
      <Table.Col key="controls" align='right' width={140}>
        <Button icon="fas fa-users-cog" onClick={() => setConfiguringUser(user)}>
          {i18n['users.table.controls.settings'][lang]}
        </Button>
      </Table.Col>
    )
  }

  const tableBody = () => {
    if (!users.length) {
      return []
    }

    const guestAccount = users.find((user: UserType) => user.designation === 'guest_account')
    const ownerAccount = users.find((user: UserType) => user.roles.find((roleEntity) => roleEntity.role === 'owner'))
    const otherUsers = users
      .filter((user: UserType) => user.userId !== guestAccount.userId)
      .filter((user: UserType) => user.userId !== ownerAccount.userId)

    const ordered = [
      ownerAccount,
      ...otherUsers,
      guestAccount,
    ]

    return ordered
      .filter((user) => !!user)
      .map((user: UserType) => {
        return [
          nameCol(user),
          enabledStatusCol(user),
          typeCol(user),
          roleCol(user),
          lastSeenCol(user?.activityStatusUpdatedAt),
          controlsCol(user),
        ]
      })
  }

  /**
   * After users are updated, refreshed the cached object of the user that is being edited.
   */
  useEffect(() => {
    if (configuringUser) {
      users.forEach((user: UserType) => {
        if (user.userId === configuringUser?.userId) {
          setConfiguringUser(user)
        }
      })
    }
  }, [users])

  return (
    <AppPage
      className="users-page"
      layout={PAGE_LAYOUT.standard}
      pageTitle={i18n['users.title'][lang]}
      capabilities={['Users.Read']}
    >
      <CardGrid>
        {
        /*
         * "Server is unclaimed" warning card.
         */
        }
        {usersRes.isSuccess && !serverIsClaimed && (
          <CardGrid.Card
            icon={<Icon fa="fas fa-info-circle" />}
            header={<H5>{i18n['users.server.unclaimed-warning'][lang]}</H5>}
          >
            {i18n['users.server.unclaimed-warning.desc'][lang]}
          </CardGrid.Card>
        )}
        {
        /*
         * Number of used cloud seats card.
         */
        }
        <CardGrid.Card
          size="xs"
          icon={<Icon fa="fas fa-users" />}
          header={<H5>{i18n['users.server.cloud-capacity'][lang]}</H5>}
        >
          {
            i18n['users.server.capacity.cloud'][lang]
              .replace('{used}', !isNaN(licensingSeats?.used) ? licensingSeats.used : 'Unknown')
              .replace('{total}', licensingSeats?.total || 'Unknown')
          }
        </CardGrid.Card>
        {
        /*
         * Number of local users card.
         */
        }
        <CardGrid.Card
          size="xs"
          icon={<Icon fa="fas fa-user-friends" />}
          header={<H5>{i18n['users.server.local-capacity'][lang]}</H5>}
          footer={(
            <>
              <Button
                onClick={() => setShowCreateUserDrawer(true)}
                type="button"
                disabled={!canUserCreateUsers}
              >
                {i18n['users.server.capacity.create'][lang]}
              </Button>
            </>
          )}
        >
          {pluralize(
            totalLocalUsers,
            i18n['users.server.capacity.local.singular'][lang].replace('{total}', totalLocalUsers),
            i18n['users.server.capacity.local.plural'][lang].replace('{total}', totalLocalUsers),
          )}
        </CardGrid.Card>
        {
        /*
         * User invitations card.
         */
        }
        <CardGrid.Card
          size="s"
          icon={<Icon fa="fas fa-envelope" />}
          header={<H5>{i18n['users.invite-user'][lang]}</H5>}
          footer={(
            <>
              <Button
                onClick={() => setShowManageInvitationsDrawer(true)}
                type="button"
                disabled={!canUserCreateInvitiations}
              >
                {i18n['users.invite-links.manage-button'][lang]}
              </Button>
            </>
          )}
          bottomAlignContent={true}
          capabilities={['Invitations.Read']}
        >
          {activeIntiations.length
            ? activeIntiations.length === 1
              ? i18n['users.invite.some-active-links.singular'][lang]
              : i18n['users.invite.some-active-links.plural'][lang].replace('{num}', activeIntiations.length)
            : i18n['users.invite.no-active-links'][lang]
          }
        </CardGrid.Card>
        {/* <CardGrid.Card
          icon={<Icon fa="fas fa-info-circle" />}
          header={<H5>{i18n['users.new-users'][lang]}</H5>}
          bottomAlignContent={true}
        >
          <ToggleSwitch
            name="allow_new_members"
            value={allowNewUsers}
            onChange={(val) => setAllowNewUsers(val)}
          />
          <Button href="https://help.cardinalapps.io/guides/cardinal-media-server/accounts" target="_blank" arrowText={true}>
            {i18n['users.server.info.desc'][lang]}
          </Button>
        </CardGrid.Card> */}
      </CardGrid>
      <Table
        className="server-user-list"
        header={[
          i18n['users.table.header.name'][lang],
          i18n['users.table.header.status'][lang],
          i18n['users.table.header.type'][lang],
          i18n['users.table.header.role'][lang],
          i18n['users.table.header.last-seen'][lang],
          null,
        ]}
        body={tableBody()}
        emptyMessage={i18n['users.table.empty'][lang]}
      />
      {!!showManageInvitationsDrawer && (
        <ManageInvitationsDrawer
          onClose={() => setShowManageInvitationsDrawer(false)}
        />
      )}
      {!!showCreateUserDrawer && (
        <CreateUserDrawer
          onClose={() => setShowCreateUserDrawer(false)}
        />
      )}
      {!!configuringUser && (
        <UserManagementDrawer
          user={configuringUser}
          onClose={() => setConfiguringUser(null)}
        />
      )}
    </AppPage>
  )
}

export default Users
