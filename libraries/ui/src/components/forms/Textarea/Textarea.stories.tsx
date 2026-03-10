import type { Meta } from '@storybook/react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../../store'

import Textarea from './Textarea'
import { settingsActions } from '../../../store/slices/settings'

const meta = {
  title: 'Forms/Textarea',
  component: Textarea,
  argTypes: {},
} satisfies Meta<typeof Textarea>

export const Default = () => {
  const field = 'textarea-default'
  const dispatch = useDispatch()
  const storeValue = useSelector((state: RootState) => state.settings?.[field])
  return (
    <Textarea
      name={field}
      value={storeValue}
      onChange={(val) => dispatch(settingsActions.set({ key: field, value: val }))}
    />
  )
}

export default meta
