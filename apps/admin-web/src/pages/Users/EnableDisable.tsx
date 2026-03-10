import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Confirm from '@cardinalapps/ui/src/components/interaction/Confirm'

import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { UserType } from '@cardinalapps/ui/src/types/user'
import { homeServerUserSelectors } from '@cardinalapps/ui/src/store/slices/homeServerUser'
import { useUpdateUserMutation } from '@cardinalapps/ui/src/store/apis/homeServerUsers'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'

import i18n from './i18n.json'
import './styles.css'

type EnableDisableUserProps = {
  user: UserType,
}

function EnableDisableUser({ user }: EnableDisableUserProps) {
  const dispatch = useAppDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const currentUser = useSelector(homeServerUserSelectors.current)
  const [updateUser, updateUserResult] = useUpdateUserMutation()
  const [showConfirmDisableUser, setShowConfirmDisableUser] = useState<boolean>(false)
  const [showConfirmEnableUser, setShowConfirmEnableUser] = useState<boolean>(false)
  const isServerOwner = user?.role === 'owner'
  const isCurrentUser = user.userId === currentUser.userId

  const handleDisableUser = () => {
    updateUser({
      id: user.userId,
      body: {
        enabled: false,
      },
    })
  }

  const handleEnableUser = () => {
    updateUser({
      id: user.userId,
      body: {
        enabled: true,
      },
    })
  }

  const getDisableButton = () => {
    const onClick = () => setShowConfirmDisableUser(true)
    const icon = "fas fa-ban"
    const label = i18n['users.settings.actions.disable'][lang]

    // Owner cannot be disabled
    if (isServerOwner) {
      return (
        <Button
          onClick={onClick}
          icon={icon}
          disabled={true}
          title={i18n['users.settings.actions.disable.disabled-for-server-owner'][lang]}
        >
          {label}
        </Button>
      )
    }
    // Users cannot disable themselves
    if (isCurrentUser) {
      return (
        <Button
          onClick={onClick}
          icon={icon}
          disabled={true}
          title={i18n['users.settings.actions.disable.disabled-for-own-user'][lang]}
        >
          {label}
        </Button>
      )
    } else {
      return (
        <Button
          onClick={onClick}
          icon={icon}
        >
          {label}
        </Button>
      )
    }
  }

  useEffect(() => {
    if (updateUserResult.isError) {
      dispatch(toastActions.addToQueue({
        type: 'danger',
        // @ts-expect-error
        title: `${updateUserResult?.error?.status} Error`,
        // @ts-expect-error
        body: updateUserResult?.error?.data?.message,
      }))
      return
    }
    if (updateUserResult.isSuccess && updateUserResult.originalArgs?.body?.enabled === true) {
      setShowConfirmEnableUser(false)
      dispatch(toastActions.addToQueue({
        type: 'success',
        title: i18n['users.updated.success'][lang],
        body: i18n['users.updated.enabled.success'][lang],
        ttl: 5000,
      }))
      return
    }
    if (updateUserResult.isSuccess && updateUserResult.originalArgs?.body?.enabled === false) {
      setShowConfirmDisableUser(false)
      dispatch(toastActions.addToQueue({
        type: 'success',
        title: i18n['users.updated.success'][lang],
        body: i18n['users.updated.disabled.success'][lang],
        ttl: 5000,
      }))
      return
    }
  }, [updateUserResult])

  return (
    <>
      {!!user?.enabled && getDisableButton()}
      {!user?.enabled && (
        <Button onClick={() => setShowConfirmEnableUser(true)} icon="fas fa-door-open">
          {i18n['users.settings.actions.enable'][lang]}
        </Button>
      )}
      {showConfirmDisableUser && (
        <Confirm
          title={i18n['users.settings.actions.disable.confirm.title'][lang]}
          message={i18n['users.settings.actions.disable.confirm.desc'][lang]}
          onClose={(confirmed) => {
            if (confirmed) {
              handleDisableUser()
            } else {
              setShowConfirmDisableUser(false)
            }
          }}
          loading={updateUserResult.isLoading}
          confirmButtonIsDangerous={true}
        />
      )}
      {showConfirmEnableUser && (
        <Confirm
          title={i18n['users.settings.actions.enable.confirm.title'][lang]}
          message={i18n['users.settings.actions.enable.confirm.desc'][lang]}
          onClose={(confirmed) => {
            if (confirmed) {
              handleEnableUser()
            } else {
              setShowConfirmEnableUser(false)
            }
          }}
          loading={updateUserResult.isLoading}
          confirmButtonIsDangerous={true}
        />
      )}
    </>
  )
}

export default EnableDisableUser
