import { useState } from 'react'
import type { Meta } from '@storybook/react'
import Confirm from './Confirm'

import Button from '../Button'
import ModalLayer from '../../layout/Modal/ModalLayer'

const meta = {
  title: 'Interaction/Confirm',
  component: Confirm,
  argTypes: {},
} satisfies Meta<typeof Confirm>

export const Default = () => {
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [confirmed, setConfirmed] = useState<boolean | undefined>()

  return (
    <div>
      <ModalLayer />
      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
        <Button onClick={() => setShowConfirm(true)}>
          Request confirmation
        </Button>
        {confirmed !== undefined && (
          <p style={{ opacity: 0.7 }}>Result: <strong>{confirmed ? 'Confirmed' : 'Cancelled'}</strong></p>
        )}
      </div>
      {showConfirm &&
        <Confirm
          title="Save changes?"
          message={<p>Any unsaved changes will be lost if you navigate away. Are you sure you want to continue?</p>}
          onClose={(confirmed) => {
            setShowConfirm(false)
            setConfirmed(confirmed)
          }}
        />
      }
    </div>
  )
}

export const Short = () => {
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [confirmed, setConfirmed] = useState<boolean | undefined>()

  return (
    <div>
      <ModalLayer />
      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
        <Button onClick={() => setShowConfirm(true)}>
          Request confirmation
        </Button>
        {confirmed !== undefined && (
          <p style={{ opacity: 0.7 }}>Result: <strong>{confirmed ? 'Confirmed' : 'Cancelled'}</strong></p>
        )}
      </div>
      {showConfirm &&
        <Confirm
          title="Are you sure?"
          message={<p>This cannot be undone.</p>}
          onClose={(confirmed) => {
            setShowConfirm(false)
            setConfirmed(confirmed)
          }}
        />
      }
    </div>
  )
}

export const EnterText = () => {
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [confirmed, setConfirmed] = useState<boolean | undefined>()

  return (
    <div>
      <ModalLayer />
      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
        <Button onClick={() => setShowConfirm(true)}>
          Delete library
        </Button>
        {confirmed !== undefined && (
          <p style={{ opacity: 0.7 }}>Result: <strong>{confirmed ? 'Confirmed' : 'Cancelled'}</strong></p>
        )}
      </div>
      {showConfirm &&
        <Confirm
          title="Delete library"
          message={<p>This will permanently delete <strong>Cardinal Music</strong> and all associated data. This action cannot be undone. Type the library name to confirm.</p>}
          mustEnterText="Cardinal Music"
          loading={loading}
          confirmButtonIsDangerous={true}
          onClose={(confirmed) => {
            if (confirmed) {
              setLoading(true)
              setTimeout(() => {
                setShowConfirm(false)
                setLoading(false)
                setConfirmed(true)
              }, 3000)
            } else {
              setShowConfirm(false)
              setConfirmed(false)
              setLoading(false)
            }
          }}
        />
      }
    </div>
  )
}

export default meta
