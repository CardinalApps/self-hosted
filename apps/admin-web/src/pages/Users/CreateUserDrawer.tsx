import { useEffect } from 'react'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { ACi18n, MediaServerRoles } from '@cardinalapps/access-control/src'

import { useCreateUserMutation } from '@cardinalapps/ui/src/store/apis/homeServerUsers'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Drawer from '@cardinalapps/ui/src/components/layout/Drawer'
import Form from '@cardinalapps/ui/src/components/forms/Form'
import FormField from '@cardinalapps/ui/src/components/forms/FormField'
import TextInput from '@cardinalapps/ui/src/components/forms/TextInput'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'
import Select from '@cardinalapps/ui/src/components/forms/Select'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from './i18n.json'
import './styles.css'

type UserManagementDrawerProps = {
  onClose: () => void,
}

function CreateUserDrawer({ onClose }: UserManagementDrawerProps) {
  const dispatch = useAppDispatch()
  const { lang } = useAppSelector(settingsSelectors.current)
  const [createUser, createUserResult] = useCreateUserMutation()

  const handleCreateAccount = (e, values) => {
    createUser({ body: values })
  }

  useEffect(() => {
    if (createUserResult.isSuccess) {
      dispatch(toastActions.addToQueue({
        type: 'success',
        ttl: 8000,
        title: i18n['create-user.submit.success'][lang],
        showClose: true,
      }))
      const formEl: HTMLFormElement = document.querySelector('.create-user-form')
      formEl?.reset?.()
    }
  }, [createUserResult.isSuccess])

  return (
    <Drawer
      className="create-user-drawer"
      title={i18n['create-user.title'][lang]}
      onClose={onClose}
    >
      <Drawer.Section capabilities={['Users.Create']}>
        <Form className="create-user-form" onSubmit={handleCreateAccount}>
          <FormField label={i18n['create-user.username'][lang]} labelFor='create-user-username'>
            <TextInput type="text" name="username" id="create-user-username" />
          </FormField>
          <FormField label={i18n['create-user.password'][lang]} labelFor='create-user-password'>
            <TextInput type="password" name="password" id="create-user-password" />
          </FormField>
          <FormField label={i18n['create-user.role'][lang]} labelAsSpan={true}>
            <Select
              name="role"
              multi={false}
              selectPlaceholder={i18n['create-user.role'][lang]}
              options={
                Object.values(MediaServerRoles)
                  .map((role) => {
                    if (!role.assignable) {
                      return null
                    }
                    return {
                      label: ACi18n[`role.${role.name}.name`]?.[lang],
                      value: role.name,
                    }
                  })
                  .filter((role) => !!role)
              }
            />
          </FormField>
          <footer>
            <Button type="submit" textual>{i18n['create-user.submit'][lang]}</Button>
          </footer>
        </Form>
      </Drawer.Section>
    </Drawer>
  )
}

export default CreateUserDrawer
