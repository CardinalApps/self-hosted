import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import CreateSomething from '@cardinalapps/ui/src/components/interaction/CreateSomething'
import DirectoryTree from '@cardinalapps/ui/src/components/interaction/DirectoryTree'
import Table from '@cardinalapps/ui/src/components/interaction/Table'
import Drawer from '@cardinalapps/ui/src/components/layout/Drawer'
import Confirm from '@cardinalapps/ui/src/components/interaction/Confirm'
import Form from '@cardinalapps/ui/src/components/forms/Form'
import FormField from '@cardinalapps/ui/src/components/forms/FormField'
import TextInput from '@cardinalapps/ui/src/components/forms/TextInput'
import AddRemove from '@cardinalapps/ui/src/components/forms/AddRemove'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import {
  Library,
  useGetLibrariesQuery,
  useCreateLibraryMutation,
  useUpdateLibraryMutation,
  useDeleteLibraryMutation,
} from '@cardinalapps/ui/src/store/apis/libraries'
import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'
import { TreeNode } from '@cardinalapps/ui/src/components/interaction/DirectoryTree/DirectoryTree'
import { UserType } from '@cardinalapps/ui/src/types/user'
import HasCapabilities from '@cardinalapps/ui/src/components/layout/HasCapabilities'
import useHasCapability from '@cardinalapps/ui/src/hooks/useHasCapability'
import UserTag from '@cardinalapps/ui/src/components/interaction/UserTag'

import homeServerAPI from '@cardinalapps/ui/src/lib/homeserver/homeServerAPI'

import i18n from './i18n.json'

import './styles.css'

function Libraries() {
  const { lang } = useSelector(settingsSelectors.current)
  const userCanUpdateLibrary = useHasCapability('Libraries.Update')
  const userCanDeleteLibrary = useHasCapability('Libraries.Delete')
  const [createLibrary, createLibraryResult] = useCreateLibraryMutation()
  const [selectedDirectories, setSelectedDirectories] = useState<TreeNode[]>()
  const [allUsers, setAllUsers] = useState<UserType[]>([])
  const [openLibrary, setOpenLibrary] = useState<Library>()
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [updateLibrary, updateLibraryResult] = useUpdateLibraryMutation()
  const [deleteLibrary, deleteLibrartResult] = useDeleteLibraryMutation()
  const {
    data: allLibrariesResponse,
    isLoading: allLibrariesLoading,
  } = useGetLibrariesQuery({ take: 9999, skip: 0, order: 'ASC' })
  const allLibraries = allLibrariesResponse || []

  /**
   * All users have access to all libraries, so list all users here.
   * 
   * TODO replace this with the library sharing feature.
   */
  const fetchPublicUsers = () => {
    return new Promise((resolve) => {
      homeServerAPI('/users?take=9999')
        .then((users) => {
          if (Array.isArray(users?.[0])) {
            resolve(users[0])
          } else {
            resolve([])
          }
        })
        .catch((error) => {
          console.error(error)
          resolve([])
        })
    })
  }

  /**
   * Load all users.
   */
  useEffect(() => {
    fetchPublicUsers()
      .then((users: UserType[]) => {
        setAllUsers(users)
      })
  }, [])

  /**
   * All table body rows.
   */
  const tableBody = () => {
    const rows = []
    allLibraries.forEach((library) => {
      rows.push([
        (
          <Table.Col key="name">
            {library.name}
          </Table.Col>
        ),
        (
          <Table.Col key="paths">
            {library.paths?.length
              ? library.paths.map((path) => <span key={path}>{path}</span>)
              : <span>{i18n['libraries.no-paths'][lang]}</span>
            }
          </Table.Col>
        ),
        (
          <Table.Col key="users">
            <div className="user-avatars">
              {allUsers?.length
                ? allUsers.map((user) => <UserTag key={user.userId} user={user} showName={false} size="s" />)
                : null
              }
            </div>
            {/* {
              library?.users?.length
              ? library.users.length === 1
                  ? i18n['libraries.table.user-count.singular'][lang]
                  : i18n['libraries.table.user-count.plural'][lang].replace('{n}', library.users.length)
                : i18n['libraries.table.user-count.none'][lang]
            } */}
          </Table.Col>
        ),
        (
          <Table.Col key="controls">
            <Button onClick={() => setOpenLibrary(library)}>
              {i18n['libraries.table.options-button'][lang]}
            </Button>
          </Table.Col>
        ),
      ])
    })
    return rows
  }

  /**
   * Create a library.
   */
  const handleCreate = (name) => {
    if (!selectedDirectories || !selectedDirectories.length) {
      return
    }
    createLibrary({ name, paths: selectedDirectories.map((selected) => selected.path) })
  }

  /**
   * Edit a library.
   */
  const handleEdit = (e, formData) => {
    updateLibrary({ id: openLibrary.id, body: {
      name: formData?.name,
      paths: formData?.paths?.map((pathObj) => pathObj.value),
    } })
  }

  /**
   * Delete a library.
   */
  const handleDelete = () => {
    deleteLibrary(openLibrary.id)
  }

  /**
   * Handle delete success.
   */
  useEffect(() => {
    if (deleteLibrartResult.isSuccess) {
      setOpenLibrary(null)
      setShowConfirmDelete(false)
    }
  }, [deleteLibrartResult])

  /**
   * Handle update success.
   */
  useEffect(() => {
    if (updateLibraryResult.isSuccess && updateLibraryResult?.data) {
      setOpenLibrary(updateLibraryResult.data)
    }
  }, [updateLibraryResult])

  return (
    <AppPage
      className={'libraries'}
      layout={PAGE_LAYOUT.files}
      pageTitle={i18n['title'][lang]}
      pageDocLink="/guides/cardinal-media-server/libraries"
      capabilities={['Libraries.Read']}
    >
      <DirectoryTree
        title={i18n['libraries.create.dirs.title'][lang]}
        multi={true}
        selectDirectory={true}
        portal={true}
        rootDir="music"
        onSelect={(selected: TreeNode[]) => setSelectedDirectories(selected)}
      />

      {!!openLibrary &&
        <Drawer
          title={i18n['libraries.drawer.title'][lang]}
          onClose={() => setOpenLibrary(null)}
        >
          <Form
            controls={
              <>
                <Button
                  type="submit"
                  onClick={() => {}}
                  disabled={!userCanUpdateLibrary}
                >
                  {i18n['libraries.edit.save'][lang]}
                </Button>
                <Button
                  animation={deleteLibrartResult.isLoading ? 'success' : ''}
                  color="danger"
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={!userCanDeleteLibrary}
                >
                  {i18n['libraries.edit.delete'][lang]}
                </Button>
              </>
            }
            onSubmit={handleEdit}
          >
            <FormField label={i18n['libraries.edit.name'][lang]}>
              <TextInput
                name="name"
                type="text"
                value={openLibrary.name}
                // TODO add update name
                disabled={true}
              />
            </FormField>
            <FormField label={i18n['libraries.edit.paths'][lang]}>
              <HasCapabilities capabilities={['Libraries.Create']}>
                <AddRemove
                  name="paths"
                  initialSelectedItems={openLibrary?.paths?.map((path) => ({ name: path, value: path } ))}
                  listOutline={false}
                  boxOutline={true}
                  customTitle={i18n['libraries.edit.add-path'][lang]}
                  allowCustom={true}
                />
              </HasCapabilities>
            </FormField>
            <FormField label={i18n['libraries.edit.users'][lang]}>
              <AddRemove
                name="users"
                initialSelectedItems={allUsers?.map((user) => ({
                  name: user?.designation === 'guest_account'
                    ? i18n['libraries.edit.users.guest-has-access'][lang]
                    : user?.cachedCloudUser?.publicName
                      ? i18n['libraries.edit.users.user-has-access'][lang].replace('{user}', user?.cachedCloudUser?.publicName)
                      : i18n['libraries.edit.users.no-public-name'][lang].replace('{user}'),
                  value: user?.userId as string,
                  canDelete: false,
                  avatar: user?.designation === 'guest_account'
                    ? { type: 'guest' }
                    : user?.cachedCloudUser?.avatar
                      ? { ...user?.cachedCloudUser?.avatar }
                      : undefined,
                } ))}
                listOutline={true}
                customTitle={i18n['libraries.edit.add-path'][lang]}
              />
            </FormField>
          </Form>
        </Drawer>
      }

      {!!showConfirmDelete && !!openLibrary &&
        <Confirm
          title={i18n['libraries.edit.confirm-delete.title'][lang]}
          message={<p>{i18n['libraries.edit.confirm-delete.message'][lang].replace('{{library}}', openLibrary.name)}</p>}
          onClose={(confirmed) => {
            if (confirmed) {
              handleDelete()
            } else {
              setShowConfirmDelete(false)
            }
          }}
        />
      }

      <div className={'libraries'}>
        <div className={'create'}>
          <CreateSomething
            fieldLabel={i18n['libraries.create.name.title'][lang]}
            placeholder={i18n['libraries.create.name.placeholder'][lang]}
            submitLabel={i18n['libraries.create.submit'][lang]}
            rtkResult={createLibraryResult}
            onSubmit={(name) => {
              handleCreate(name)
            }}
          />
        </div>
        <div className={'librariesTable'}>
          <Table
            header={[
              i18n['libraries.table.header.name'][lang],
              i18n['libraries.table.header.path'][lang],
              i18n['libraries.table.header.access'][lang],
              null,
            ]}
            body={tableBody()}
            emptyMessage={i18n['libraries.table.empty-message'][lang]}
            loading={allLibrariesLoading}
          />
        </div>
      </div>
    </AppPage>
  )
}

export default Libraries
