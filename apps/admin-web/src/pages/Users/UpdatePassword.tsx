import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import Button from '@cardinalapps/ui/src/components/interaction/Button'

import Modal from '@cardinalapps/ui/src/components/layout/Modal'
import Form from '@cardinalapps/ui/src/components/forms/Form'
import TextInput from '@cardinalapps/ui/src/components/forms/TextInput'
import FormField from '@cardinalapps/ui/src/components/forms/FormField'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { UserType } from '@cardinalapps/ui/src/types/user'
import { useUpdateUserMutation } from '@cardinalapps/ui/src/store/apis/homeServerUsers'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'

import i18n from './i18n.json'
import './styles.css'

type UpdatePasswordProps = {
  user: UserType,
}

function UpdatePassword({ user }: UpdatePasswordProps) {
  const dispatch = useAppDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const [updateUser, passwordUpdateResult] = useUpdateUserMutation()
  const [showUpdatePasswordModal, setShowUpdatePasswordModal] = useState<boolean>(false)

  const handleUpdatePassword = (e, values) => {
    updateUser({
      id: user.userId,
      body: {
        password: values?.password,
      },
    })
  }

  useEffect(() => {
    if (passwordUpdateResult.isSuccess) {
      setShowUpdatePasswordModal(false)
      dispatch(toastActions.addToQueue({
        type: 'success',
        title: i18n['users.updated.success'][lang],
        ttl: 5000,
      }))
      return
    }
  }, [passwordUpdateResult])

  return (
    <>
      <Button
        data-testid="user-update-password-trigger"
        onClick={() => setShowUpdatePasswordModal(true)}
        icon={"fas fa-key"}
      >
        {i18n['users.settings.actions.update-password'][lang]}
      </Button>
      {showUpdatePasswordModal && (
        <Modal
          loading={passwordUpdateResult.isLoading}
          onClose={() => setShowUpdatePasswordModal(false)}
        >
          <Form
            onSubmit={handleUpdatePassword}
            controls={
              <Button data-testid="user-update-password-submit" type="submit">{i18n['users.updated.password.submit'][lang]}</Button>
            }
          >
            <FormField labelFor="password" label={i18n['users.updated.password.success'][lang]}>
              <TextInput id="password" name="password" type="password" />
            </FormField>
          </Form>
        </Modal>
      )}
    </>
  )
}

export default UpdatePassword
