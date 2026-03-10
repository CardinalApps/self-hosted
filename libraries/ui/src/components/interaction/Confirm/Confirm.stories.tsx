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
  const [showConfirm, setShowConfim] = useState<boolean>(false)
  const [confirmed, setConfirmed] = useState<boolean>()

  return (
    <div>
      <ModalLayer />
      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
        <Button onClick={() => setShowConfim(true)}>
          Get confirmation
        </Button>
        <p>Result: {confirmed ? 'Confirmed' : 'Not confirmed'}</p>
      </div>
      {showConfirm &&
        <Confirm
          title={'Confirm that action'}
          message={<p>Confirmation messages can have custom content. If none is supplied, a default will be used.</p>}
          onClose={(confirmed) => {
            setShowConfim(false)
            setConfirmed(confirmed)
          }}
        />
      }
    </div>
  )
}

export const Short = () => {
  const [showConfirm, setShowConfim] = useState<boolean>(false)
  const [confirmed, setConfirmed] = useState<boolean>()

  return (
    <div>
      <ModalLayer />
      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
        <Button onClick={() => setShowConfim(true)}>
          Get confirmation
        </Button>
        <p>Result: {confirmed ? 'Confirmed' : 'Not confirmed'}</p>
      </div>
      {showConfirm &&
        <Confirm
          title={'Confirm'}
          message={<p>Smol</p>}
          onClose={(confirmed) => {
            setShowConfim(false)
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
  const [confirmed, setConfirmed] = useState<boolean>()

  return (
    <div>
      <ModalLayer />
      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
        <Button onClick={() => setShowConfirm(true)}>
          Get confirmation
        </Button>
        <p>Result: {confirmed ? 'Confirmed' : 'Not confirmed'}</p>
      </div>
      {showConfirm &&
        <Confirm
          title={'Confirm'}
          message={<p>Are you sure you want to delete $importantThing?</p>}
          mustEnterText="Important Resource"
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
