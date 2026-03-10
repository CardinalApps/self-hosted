import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import ms from 'ms'

import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import Drawer from '@cardinalapps/ui/src/components/layout/Drawer'
import List from '@cardinalapps/ui/src/components/interaction/List'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import TextInput from '@cardinalapps/ui/src/components/forms/TextInput'
import DatePicker from '@cardinalapps/ui/src/components/forms/DatePicker'
import Form from '@cardinalapps/ui/src/components/forms/Form'
import FormField from '@cardinalapps/ui/src/components/forms/FormField'
import Span from '@cardinalapps/ui/src/components/typography/Span'
import P from '@cardinalapps/ui/src/components/typography/P'
import Confirm from '@cardinalapps/ui/src/components/interaction/Confirm'
import { formatTimeAgo } from '@cardinalapps/ui/src/lib/formatting/time'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { DrawIntitationTabType } from './ManageInvitationsDrawer'

import {
  InvitationType,
  useCreateInvitationMutation,
  useGetInvitationsQuery,
  useDeleteInvitationMutation,
} from '@cardinalapps/ui/src/store/apis/invitations'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'

import i18n from './i18n.json'

import './styles.css'

function InvitationLinks({ getExpiration }: DrawIntitationTabType) {
  const dispatch = useAppDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const [generatedLink, setGeneratedLink] = useState<string>()
  const [confirmingDelete, setConfirmingDelete] = useState<InvitationType>()

  const [showComingSoon, setShowComingSoon] = useState<boolean>(false)

  const [createInvitation, createInvitationResult] = useCreateInvitationMutation({})
  const [deleteInvitation, deleteInvitationResult] = useDeleteInvitationMutation()
  const res = useGetInvitationsQuery({ type: 'link' })
  const data = res?.data?.[0] || []

  const handleCreateInvitiationLink = (e, values) => {
    setShowComingSoon(true)
    return

    // eslint-disable-next-line no-unreachable
    if (!generatedLink) {
      createInvitation({
        type: 'link',
        expiresAt: new Date(values?.expiration),
      })
    }
  }

  /**
   * Handle create success.
   */
  useEffect(() => {
    if (createInvitationResult.isSuccess) {
      setGeneratedLink(createInvitationResult.data?.cloudLink)
    }
  }, [createInvitationResult.isSuccess])

  /**
   * Handle create error.
   */
  useEffect(() => {
    if (createInvitationResult.isError) {
      dispatch(toastActions.addToQueue({
        type: 'danger',
        title: 'status' in deleteInvitationResult.error ? deleteInvitationResult.error.status.toString() : 'Error',
        body: 'data' in deleteInvitationResult.error
            // @ts-expect-error
            ? deleteInvitationResult.error.data?.message
            : 'Error',
      }))
    }
  }, [createInvitationResult.isError])

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
      <Drawer.Section className="create-invitiation-link">
        <p>{i18n['users.invite.link.create.notice'][lang]}</p>
        <Form
          onSubmit={(e, values) => handleCreateInvitiationLink(e, values)}
        >
          <FormField label={i18n['users.invite.link.create.expiration'][lang]} labelFor="invitation-link-expiration">
            <DatePicker
              id="invitation-link-expiration"
              name="expiration"
              min={new Date(Date.now() + ms('1 day')).toString()}
              required={true}
              type="datetime-local"
            />
          </FormField>
          <Button
            className="create-invitation-link"
            type="submit"
            animation={createInvitationResult.originalArgs?.type === 'link' && createInvitationResult.isLoading
              ? 'loading'
              : null
            }
          >
            {i18n['users.invite.link.generate'][lang]}
          </Button>
        </Form>
        {!!generatedLink && (
          <TextInput
            className="generated-invitation-link"
            name="generated-link"
            value={generatedLink}
          />
        )}
      </Drawer.Section>
      <Drawer.Section title={i18n['users.invite-links.history.title'][lang]}>
        {!data?.length && <p className="no-invitations">{i18n['users.invite.link.none'][lang]}</p>}
        {!!data?.length && (
          <List
            items={data?.map((invitation) => {
              return {
                name: (
                  <div className="invite-link-info">
                    <P truncate={true}>
                      <Span>
                        <strong>{i18n['users.invite.link.code'][lang]}</strong>
                        {invitation?.userFriendlyCode}
                      </Span>
                    </P>
                    <P truncate={true}>
                      <Span>
                        <strong>{i18n['users.invite.link.cloud-link'][lang]}</strong>
                        <a href={invitation?.cloudLink} target="_blank">{invitation?.cloudLink}</a>
                      </Span>
                    </P>
                    <div>
                      <P truncate={true}>
                        <Span>{getExpiration(invitation?.expiresAt)}</Span>
                      </P>
                      <P truncate={true}>
                        <Span>
                          {
                            i18n['users.invite.link.created-at-by'][lang]
                              .replace('{ago}', formatTimeAgo(invitation?.createdAt))
                          }
                        </Span>
                      </P>
                    </div>
                  </div>
                ),
                copyable: invitation?.cloudLink || 'missing link',
                controls: ['copy', 'delete'],
                onDelete: () => {
                  setConfirmingDelete(invitation)
                },
              }
            })}
          />
        )}
      </Drawer.Section>
      {!!showComingSoon && (
        <Confirm
          title={i18n['users.invite.confirm.title'][lang]}
          //message={i18n['users.invite.confirm.desc'][lang].replace('{name}', userToInvite)}
          message={'This feature is coming soon.'}
          loading={createInvitationResult.isLoading}
          onClose={(confirmed) => {
            setShowComingSoon(false)
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
          message={i18n['users.invite.confirm-delete.desc'][lang]}
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

export default InvitationLinks
