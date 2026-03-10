import { useState } from 'react'
import type { Meta } from '@storybook/react'

import AddRemove from './AddRemove'
import Form from '../Form'
import FormField from '../FormField'
import Button from '../../interaction/Button'

const meta = {
  title: 'Forms/AddRemove',
  component: AddRemove,
  argTypes: {},
} satisfies Meta<typeof AddRemove>

export const Default = () => {
  const [selectedUsers, setSelectedUsers] = useState([
    { name: 'Owner (cannot be removed)', value: 'owner', canDelete: false, icon: { fa: 'fas fa-crown' } },
    { name: 'User A', value: 'user-a' },
  ])
  const [availableUsers, setAvailableUsers] = useState([
    { name: 'User B', value: 'user-b' },
    { name: 'User C', value: 'user-c' },
    { name: 'User D', value: 'user-d' },
    { name: 'User E', value: 'user-e' },
  ])

  /**
   * The form data contains the new list of selected items. We must figure out
   * which have been added/deleted externally.
   */
  const handleSubmit = (e, formData) => {
    const newSelectedUsers = formData['selected-user-list']
    if (newSelectedUsers) {
      setAvailableUsers([...availableUsers]
        .filter((available) => !newSelectedUsers.find((newSelected) => newSelected?.value === available?.value))
        .concat([...selectedUsers].filter((maybeDeleted) => !newSelectedUsers.find((newSelected) => newSelected?.value === maybeDeleted?.value))),
      )
      setSelectedUsers([...newSelectedUsers])
    }
  }

  return (
    <>
      <Form
        onSubmit={handleSubmit}
        controls={
          <>
            <Button type="submit">
              Save
            </Button>
          </>
        }
      >
        <FormField>
          <AddRemove
            name={'selected-user-list'}
            initialSelectedItems={selectedUsers}
            initialAvailableItems={availableUsers}
            selectedTitle={'Remove users'}
            availableTitle={'Available users'}
            onChange={(items) => console.log('list change', items)}
          />
        </FormField>
      </Form>
    </>
  )
}

export const OnlyRemove = () => {
  const [selectedUsers, setSelectedUsers] = useState([
    { name: 'Owner (cannot be removed)', value: 'owner', canDelete: false },
    { name: 'User A', value: 'user-a' },
    { name: 'User B', value: 'user-b' },
    { name: 'User C', value: 'user-c' },
  ])

  /**
   * The form data contains the new list of selected items. We must figure out
   * which have been added/deleted externally.
   */
  const handleSubmit = (e, formData) => {
    const newSelectedUsers = formData['selected-user-list']
    if (newSelectedUsers) {
      setSelectedUsers([...newSelectedUsers])
    }
  }

  return (
    <>
      <Form
        onSubmit={handleSubmit}
        controls={
          <>
            <Button type="submit">
              Save
            </Button>
          </>
        }
      >
        <FormField>
          <AddRemove
            name={'selected-user-list'}
            initialSelectedItems={selectedUsers}
            selectedTitle={'Remove users'}
            listOutline={false}
          />
        </FormField>
      </Form>
    </>
  )
}

export const AddCustom = () => {
  const [selectedUsers, setSelectedUsers] = useState([
    { name: 'Cat (cannot be removed)', value: 'Cat (cannot be removed)', canDelete: false },
    { name: 'Dog', value: 'Dog' },
    { name: 'Cow', value: 'Cow' },
    { name: 'Bird', value: 'Bird' },
  ])

  /**
   * The form data contains the new list of selected items. We must figure out
   * which have been added/deleted externally.
   */
  const handleSubmit = (e, formData) => {
    const newSelectedUsers = formData['selected-user-list']
    if (newSelectedUsers) {
      setSelectedUsers([...newSelectedUsers])
    }
  }

  return (
    <>
      <Form
        onSubmit={handleSubmit}
        controls={
          <>
            <Button type="submit">
              Save
            </Button>
          </>
        }
      >
        <FormField>
          <AddRemove
            name={'selected-user-list'}
            initialSelectedItems={selectedUsers}
            selectedTitle={'List of animals'}
            listOutline={false}
            boxOutline={true}
            allowCustom={true}
            customTitle={"Add animal"}
          />
        </FormField>
      </Form>
    </>
  )
}

export default meta
