import type { Meta } from '@storybook/react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../../store'

import DatePicker from './DatePicker'
import { settingsActions } from '../../../store/slices/settings'

const meta = {
  title: 'Forms/DatePicker',
  component: DatePicker,
  argTypes: {},
} satisfies Meta<typeof DatePicker>

export const Default = () => {
  const field = 'datepicker-default'
  const dispatch = useDispatch()
  const storeValue = useSelector((state: RootState) => state.settings?.[field])
  return (
    <DatePicker
      name={field}
      value={storeValue}
      onChange={(val) => dispatch(settingsActions.set({ key: field, value: val }))}
    />
  )
}

export default meta
