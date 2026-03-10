import { useEffect, useState, useMemo } from 'react'
import { ACi18n, MediaServerRoleNames, getMediaServerRole, Role, MediaServerRoles, MediaServerRoleName, MediaServerCapabilityAssignment } from '@cardinalapps/access-control/src'

import H5 from '@cardinalapps/ui/src/components/typography/H5'
import List from '@cardinalapps/ui/src/components/interaction/List'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import { ListItem } from '@cardinalapps/ui/src/components/interaction/List/List'
import Drawer from '@cardinalapps/ui/src/components/layout/Drawer'
import { pluralize } from '@cardinalapps/ui/src/lib/formatting/text'
import WrittenText from '@cardinalapps/ui/src/components/typography/WrittenText'
import UserTag from '@cardinalapps/ui/src/components/interaction/UserTag'
import AddRemove from '@cardinalapps/ui/src/components/forms/AddRemove'
import Form from '@cardinalapps/ui/src/components/forms/Form'
import FormField from '@cardinalapps/ui/src/components/forms/FormField'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import useHasCapability from '@cardinalapps/ui/src/hooks/useHasCapability'

import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { useGetUsersQuery } from '@cardinalapps/ui/src/store/apis/homeServerUsers'
import { RoleAssignmentEntity, useCreateRoleAssignmentsMutation, useDeleteRoleAssignmentsMutation, useGetRoleAssignmentsQuery } from '@cardinalapps/ui/src/store/apis/roleAssignments'
import { UserType } from '@cardinalapps/ui/src/types/user'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'

import i18n from './i18n.json'

function RolesList() {
  const dispatch = useAppDispatch()
  const { lang } = useAppSelector(settingsSelectors.current)
  const [drawerRoleSlug, setDrawerRoleSlug] = useState<MediaServerRoleNames>()
  const drawerRole: Role<MediaServerCapabilityAssignment> = getMediaServerRole(drawerRoleSlug)
  const userCanAddRole = useHasCapability('RoleAssignments.Create')
  const userCanDeleteRole = useHasCapability('RoleAssignments.Delete')

  const usersRes = useGetUsersQuery({ take: 9999 })
  const users = usersRes?.data ? usersRes.data?.[0] : []

  const {
    data: roleAssignmentsData,
  } = useGetRoleAssignmentsQuery({
    take: 9999,
    skip: 0,
  })
  const [roleAssignments] = roleAssignmentsData || [[], 0]
  const [createRoleAssignments, createRoleAssignmentsResult] = useCreateRoleAssignmentsMutation()
  const [deleteRoleAssignments, deleteRoleAssignmentsResult] = useDeleteRoleAssignmentsMutation()

  /**
   * Return all users with the given role.
   */
  const usersWithRole = (role: string) => roleAssignments
    .filter((assignment: RoleAssignmentEntity) => assignment.role === role)
    .map((assignment) => assignment.user)

  /**
   * Return all users that don't have the given role.
   */
  const usersWithoutRole = (role: string) => users.filter((user: UserType) => {
    const userRoleAssignments = roleAssignments.filter((assignment) => assignment.user?.userId === user?.userId)

    // Never show the owner in the available users
    if (userRoleAssignments.find((assignment) => assignment.role === 'owner')) {
      return false
    }

    // Never show the guest account in the available users
    if (user.designation === 'guest_account') {
      return false
    }

    return !userRoleAssignments.find((assignment) => assignment.role === role)
  })

  /**
   * List items for the roles box.
   */
  const rolesList = () => {
    return Object.keys(MediaServerRoles).map((role) => {
      const numUsersWithRole = usersWithRole(role).length
      return {
        name: ACi18n[`role.${role}.name`]?.[lang],
        label: pluralize(numUsersWithRole, i18n['roles.num-users.singular'][lang], i18n['roles.num-users.plural'][lang]).replace('{num}', numUsersWithRole),
        controls: ['view'],
        onView: () => setDrawerRoleSlug(role as MediaServerRoleName),
      } as ListItem
    })
  }

  /**
   * The list used when the role is not editable.
   */
  const roleUsersUneditableList = (roleSlug: MediaServerRoleNames) => {
    return usersWithRole(roleSlug).map((user: UserType) => {
      return {
        name: <UserTag user={user} size="s" />,
      } as ListItem
    })
  }

  /**
   * Assign and revoke roles with one form action.
   */
  const handleUpdateRoleAssignments = (e, formData) => {
    const draftAssignments = formData['role-assignments']
    const draftUsersIds = draftAssignments.map((assignment) => assignment.value)

    const removedUsers = usersWithRole(drawerRoleSlug)
      .filter((maybeRemoved) => !draftUsersIds.includes(maybeRemoved.userId))
      .map((user) => user.userId)

    const addedUsers = draftUsersIds
      .filter((maybeAdded) => usersWithoutRole(drawerRoleSlug).map((user) => user.userId).includes(maybeAdded))

    if (addedUsers.length) {
      createRoleAssignments({ userIds: addedUsers, role: drawerRoleSlug })
    }

    if (removedUsers.length) {
      deleteRoleAssignments({ userIds: removedUsers, role: drawerRoleSlug })
    }
  }

  /**
   * When roles are assigned.
   */
  useEffect(() => {
    if (createRoleAssignmentsResult.isSuccess) {
      const numAffected = createRoleAssignmentsResult?.data?.length
      dispatch(toastActions.addToQueue({
        title: pluralize(numAffected, i18n['roles.drawer.assign.success.singular'][lang], i18n['roles.drawer.assign.success.plural'][lang]).replace('{num}', numAffected),
        ttl: 6000,
        type: numAffected === 0 ? 'warning' : 'success',
      }))
    }
  }, [createRoleAssignmentsResult.isSuccess])

  /**
   * When roles are revoked.
   */
  useEffect(() => {
    if (deleteRoleAssignmentsResult.isSuccess) {
      const numAffected = deleteRoleAssignmentsResult?.data?.length
      dispatch(toastActions.addToQueue({
        title: pluralize(numAffected, i18n['roles.drawer.revoke.success.singular'][lang], i18n['roles.drawer.revoke.success.plural'][lang]).replace('{num}', numAffected),
        ttl: 6000,
        type: numAffected === 0 ? 'warning' : 'success',
      }))
    }
  }, [deleteRoleAssignmentsResult.isSuccess])

  const MemoizedAddRemove = useMemo(() => {
    const getName = (user) => {
      return user?.designation === 'guest_account'
        ? i18n['roles.drawer.user-list.guest'][lang]
        : user?.cardinalId
          ? user?.cachedCloudUser?.publicName || 'Cardinal User'
          : user?.username
    }
    const getAvatar = (user) => {
      return user?.designation === 'guest_account'
        ? { type: 'guest' }
        : user?.cachedCloudUser?.avatar
          ? { ...user?.cachedCloudUser?.avatar }
          : { initials: user?.username?.substring(0, 2).toUpperCase(), type: 'color', color: 'var(--accent-color)' }
    }
    return (
      <AddRemove
        name="role-assignments"
        availableTitle={i18n['roles.drawer.user-list.available'][lang]}
        initialSelectedItems={
          usersWithRole(drawerRoleSlug)
            .map((user) => ({
              name: getName(user),
              value: user?.userId,
              canDelete: userCanDeleteRole ? user?.designation !== 'guest_account' : false,
              avatar: getAvatar(user),
            }))
        }
        initialAvailableItems={
          usersWithoutRole(drawerRoleSlug)
            .map((user) => ({
              name: getName(user),
              value: user?.userId,
              canAdd: userCanAddRole,
              avatar: getAvatar(user),
            }))
        }
      />
    )
  }, [drawerRoleSlug, roleAssignments.length, users.length])

  return (
    <CardGrid.Card
      size="m"
      className={'roles-list'}
      header={<H5 className={'title'}>{i18n['roles-list.title'][lang]}</H5>}
    >
      <List
        layout="compact"
        items={rolesList()}
      />
      {!!drawerRoleSlug &&
        <Drawer
          className="role-drawer"
          title={ACi18n[`role.${drawerRoleSlug}.name`][lang]}
          subtitle={i18n['roles.drawer.subtitle'][lang]}
          onClose={() => setDrawerRoleSlug(undefined)}
        >
          <Drawer.Section>
            <WrittenText className="role-description">
              {ACi18n[`role.${drawerRoleSlug}.description`][lang]}
            </WrittenText>
          </Drawer.Section>
          <Drawer.Section>
            <List
              layout='compact'
              items={[
                {
                  name: i18n['roles.drawer.max-assignments'][lang],
                  label: MediaServerRoles[drawerRoleSlug].maxUsers !== null
                    ? MediaServerRoles[drawerRoleSlug].maxUsers
                    : i18n['roles.drawer.max-assignments.unlimited'][lang],
                },
                {
                  name: i18n['roles.drawer.can-be-assigned'][lang],
                  label: MediaServerRoles[drawerRoleSlug].revocable
                    ? i18n['roles.drawer.can-be-assigned.true'][lang]
                    : i18n['roles.drawer.can-be-assigned.false'][lang],
                },
                {
                  name: i18n['roles.drawer.can-be-revoked'][lang],
                  label: MediaServerRoles[drawerRoleSlug].revocable
                    ? i18n['roles.drawer.can-be-assigned.true'][lang]
                    : i18n['roles.drawer.can-be-assigned.false'][lang],
                },
              ]}
            />
          </Drawer.Section>
          <Drawer.Section title={i18n['roles.drawer.user-list-title'][lang]}>
            {drawerRole.assignable && drawerRole.revocable
              ? (
                <Form
                  onSubmit={handleUpdateRoleAssignments}
                  controls={
                    <Button
                      type="submit"
                      animation={createRoleAssignmentsResult.isLoading || deleteRoleAssignmentsResult.isLoading ? 'loading' : undefined}
                    >
                      {i18n['roles.drawer.user-list.save'][lang]}
                    </Button>
                  }
                >
                  <FormField>
                    {MemoizedAddRemove}
                  </FormField>
                </Form>
              )
              : (
                <List
                  items={roleUsersUneditableList(drawerRoleSlug)}
                />
              )
            }
          </Drawer.Section>
        </Drawer>
      }
    </CardGrid.Card>
  )
}

export default RolesList
