import { useEffect } from 'react'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'

import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Drawer from '@cardinalapps/ui/src/components/layout/Drawer'
import Form from '@cardinalapps/ui/src/components/forms/Form'
import FormField from '@cardinalapps/ui/src/components/forms/FormField'
import TextInput from '@cardinalapps/ui/src/components/forms/TextInput'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'
import { TreeNode } from '@cardinalapps/ui/src/components/interaction/DirectoryTree/DirectoryTree'
import WrittenText from '@cardinalapps/ui/src/components/typography/WrittenText'
import P from '@cardinalapps/ui/src/components/typography/P'
import Alert from '@cardinalapps/ui/src/components/interaction/Alert'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { useCreateLibraryMutation } from '@cardinalapps/ui/src/store/apis/libraries'

import i18n from './i18n.json'
import './styles.css'

type CreateLibraryDrawerProps = {
  selectedDirectories: TreeNode[] | TreeNode,
  onClose: () => void,
}

function CreateLibraryDrawer({ selectedDirectories, onClose }: CreateLibraryDrawerProps) {
  const dispatch = useAppDispatch()
  const { lang } = useAppSelector(settingsSelectors.current)
  const [createLibrary, createLibraryResult] = useCreateLibraryMutation()
  const numSelected = selectedDirectories && Array.isArray(selectedDirectories)
    ? selectedDirectories.length
    : selectedDirectories ? 1 : 0

  /**
   * Create a library.
   */
  const handleCreate = (e, formData) => {
    if (!selectedDirectories || !numSelected || !formData?.name) {
      return
    }
    const asArray = Array.isArray(selectedDirectories) ? selectedDirectories : [selectedDirectories]
    createLibrary({ name: formData.name, paths: asArray.map((selected) => selected.path) })
  }

  useEffect(() => {
    if (createLibraryResult.isSuccess) {
      dispatch(toastActions.addToQueue({
        type: 'success',
        ttl: 5000,
        title: i18n['libraries.create.success'][lang],
        showClose: true,
      }))
      const formEl: HTMLFormElement = document.querySelector('.create-user-form')
      formEl?.reset?.()
      onClose()
    }
  }, [createLibraryResult.isSuccess])

  return (
    <Drawer
      className="create-user-drawer"
      title={i18n['libraries.create.title'][lang]}
      onClose={onClose}
    >
      <Drawer.Section>
        {numSelected
          ? (
            <WrittenText>
              <P>{i18n['libraries.create.desc'][lang]}</P>
            </WrittenText>
          )
          : (
            <Alert type='warning' message={i18n['libraries.create.none-selected'][lang]} />
          )
        }
      </Drawer.Section>
      <Drawer.Section capabilities={['Libraries.Create']}>
        <Form className="create-library-form" onSubmit={handleCreate}>
          <FormField label={i18n['libraries.create.name.label'][lang]} labelFor='create-library-name'>
            <TextInput type="text" name="name" id="create-library-name" />
          </FormField>
          <footer>
            <Button type="submit" textual>{i18n['libraries.create.submit'][lang]}</Button>
          </footer>
        </Form>
      </Drawer.Section>
    </Drawer>
  )
}

export default CreateLibraryDrawer
