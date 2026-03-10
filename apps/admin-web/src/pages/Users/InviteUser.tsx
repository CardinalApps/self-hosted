import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import Drawer from '@cardinalapps/ui/src/components/layout/Drawer'
import List from '@cardinalapps/ui/src/components/interaction/List'
import SearchBar from '@cardinalapps/ui/src/components/interaction/SearchBar'
import Confirm from '@cardinalapps/ui/src/components/interaction/Confirm'
import Span from '@cardinalapps/ui/src/components/typography/Span'
import Form from '@cardinalapps/ui/src/components/forms/Form'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import { InvitationType, useCreateInvitationMutation, useDeleteInvitationMutation, useGetInvitationsQuery } from '@cardinalapps/ui/src/store/apis/invitations'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'
import { DrawIntitationTabType } from './ManageInvitationsDrawer'

import i18n from './i18n.json'

import './styles.css'

function UserInvitations({ getExpiration }: DrawIntitationTabType) {
  const dispatch = useAppDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const [showConfirmInvite, setShowConfirmInvite] = useState<boolean>(false)
  const [confirmingDelete, setConfirmingDelete] = useState<InvitationType>()

  const [, setUserToInvite] = useState<string>()

  const [, createInvitationResult] = useCreateInvitationMutation({})
  const [deleteInvitation, deleteInvitationResult] = useDeleteInvitationMutation()
  const res = useGetInvitationsQuery({ type: 'user' })
  const data = res?.data?.[0] || []

  const handleSearch = (val) => {
    if (val?.query) {
      setShowConfirmInvite(true)
      setUserToInvite(val.query)
    }
  }

  useEffect(() => {
    if (createInvitationResult.isSuccess) {
      setShowConfirmInvite(false)
      dispatch(toastActions.addToQueue({
        type: 'success',
        ttl: 5000,
        title: i18n['users.invite.sent-invite-to-user'][lang],
      }))
    }
  }, [createInvitationResult.isSuccess])

  /**
   * Handle delete success.
   */
  useEffect(() => {
    if (deleteInvitationResult.isSuccess) {
      setConfirmingDelete(null)
    }
  }, [deleteInvitationResult.isSuccess])

  /**
   * Handle delete error.
   */
  useEffect(() => {
    if (deleteInvitationResult.isError) {
      dispatch(toastActions.addToQueue({
        type: 'danger',
        title: 'status' in deleteInvitationResult.error ? deleteInvitationResult.error.status.toString() : 'Error',
        body: 'data' in deleteInvitationResult.error
            // @ts-expect-error
            ? deleteInvitationResult.error.data?.message
            : 'Error',
      }))
    }
  }, [deleteInvitationResult.isError])

  return (
    <>
      <Drawer.Section>
        <Form onSubmit={(e, val) => handleSearch(val)}>
          <SearchBar
            placeholder={i18n['users.invite-links.search.placeholder'][lang]}
          />
        </Form>
        {/* TODO add search */}
        <p className="invite-user-notice">
          {i18n['users.invite-links.search.notice'][lang]}
        </p>
        {/* <UserTag showAvatar={true} size='l' user={user} /> */}
      </Drawer.Section>
      <Drawer.Section title={i18n['users.invite-links.history.title'][lang]}>
        {!data?.length && <p className="no-invitations">{i18n['users.invite.user.none'][lang]}</p>}
        {!!data?.length && (
          <List
            items={data?.map((invitation) => {
              return {
                // TODO show cardinal public name
                name: invitation?.invitationId.split('-')[0],
                label: <Span truncate={true}>{getExpiration(invitation?.expiresAt)}</Span>,
                title: getExpiration(invitation?.expiresAt, true),
                controls: ['delete'],
                onDelete: () => {
                  setConfirmingDelete(invitation)
                },
              }
            })}
          />
        )}
      </Drawer.Section>
      {!!showConfirmInvite && (
        <Confirm
          title={i18n['users.invite.confirm.title'][lang]}
          //message={i18n['users.invite.confirm.desc'][lang].replace('{name}', userToInvite)}
          message={'This feature is coming soon.'}
          loading={createInvitationResult.isLoading}
          onClose={(confirmed) => {
            setShowConfirmInvite(false)
            if (confirmed) {
              // createInvitation({
              //   type: 'user',
              //   invitee: {
              //     userId: 'someuser123',
              //   },
              // })
            }
          }}
        />
      )}
      {!!confirmingDelete && (
        <Confirm
          title={i18n['users.invite.confirm-delete.title'][lang]}
          message={i18n['users.invite.confirm-delete-for-user.desc'][lang]}
          loading={deleteInvitationResult.isLoading}
          confirmButtonIsDangerous={true}
          onClose={(confirmed) => {
            if (confirmed) {
              deleteInvitation(confirmingDelete?.invitationId)
            } else {
              setConfirmingDelete(null)
            }
          }}
        />
      )}
    </>
  )
}

export default UserInvitations
