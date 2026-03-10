import { useState } from 'react'

import AppPage from '../../AppPage'

import WrittenText from '../../../../typography/WrittenText'

import Button from '../../../../interaction/Button'
import Drawer from '../../../../layout/Drawer'

import { PAGE_LAYOUT } from '../../../../../store/slices/layout'

function DrawerPage() {
  const [testDrawerOpen, setTestDrawerOpen] = useState(false)

  return (
    <AppPage layout={PAGE_LAYOUT.standard} pageTitle="Feature: Drawer">
      <WrittenText>
        <div>
          <Button onClick={() => setTestDrawerOpen(true)}>Test Drawer</Button>
          {testDrawerOpen && <Drawer onClose={() => setTestDrawerOpen(false)}>Test drawer</Drawer>}
        </div>
      </WrittenText>
    </AppPage>
  )
}

export default DrawerPage
