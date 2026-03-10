import { useState } from 'react'

import AppPage from '../../AppPage'

import WrittenText from '../../../../typography/WrittenText'

import Button from '../../../../interaction/Button'
import Modal from '../../../../layout/Modal'

import { PAGE_LAYOUT } from '../../../../../store/slices/layout'

function ModalPage() {
  const [testModalOpen, setTestModalOpen] = useState(false)

  return (
    <AppPage layout={PAGE_LAYOUT.standard} pageTitle="Feature: Modal">
      <WrittenText>
        <div>
          <Button onClick={() => setTestModalOpen(true)}>Test Modal</Button>
          {testModalOpen && <Modal onClose={() => setTestModalOpen(false)}>Test modal</Modal>}
        </div>
      </WrittenText>
    </AppPage>
  )
}

export default ModalPage
