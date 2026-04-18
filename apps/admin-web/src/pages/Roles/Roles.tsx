import { useState } from 'react'
import { useSelector } from 'react-redux'
import { MediaServerAspect, MediaServerRoleNames } from '@cardinalapps/access-control/src'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import RolesList from './RolesList'
import CapabilitiesList from './CapabilitiesList'
import Toolbar from '@cardinalapps/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '@cardinalapps/ui/src/components/interaction/Toolbar/types'

import i18n from './i18n.json'
import './styles.css'

const TOOLBAR_NAME = 'admin-roles'

function Roles() {
  const { lang } = useSelector(settingsSelectors.current)
  const [globallySelectedAspect, setGloballySelectedAspect] = useState<MediaServerAspect>()
  const [globallySelectedRole, setGloballySelectedRole] = useState<MediaServerRoleNames>()

  return (
    <AppPage
      layout={PAGE_LAYOUT.standard}
      pageTitle={i18n['title'][lang]}
      capabilities={['RoleAssignments.Read']}
      toolbar={(
        <Toolbar
          name={TOOLBAR_NAME}
          items={[
            [
              {
                slug: ToolbarItem.BREADCRUMBS,
                render: ToolbarItem.BREADCRUMBS,
              },
            ],
          ]}
        />
      )}
    >
      <CardGrid rowHeight='l'>
        <RolesList />
        <CapabilitiesList
          globallySelectedAspect={globallySelectedAspect}
          setGloballySelectedAspect={setGloballySelectedAspect}
          globallySelectedRole={globallySelectedRole}
          setGloballySelectedRole={setGloballySelectedRole}
        />
      </CardGrid>
    </AppPage>
  )
}

export default Roles
