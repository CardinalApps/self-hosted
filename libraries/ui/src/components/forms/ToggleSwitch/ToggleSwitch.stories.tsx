import type { Meta } from '@storybook/react'
import { useDispatch, useSelector } from 'react-redux'

import ToggleSwitch from './ToggleSwitch'
import { settingsActions, settingsSelectors } from '../../../store/slices/settings'

const meta = {
  title: 'Forms/ToggleSwitch',
  component: ToggleSwitch,
  argTypes: {},
} satisfies Meta<typeof ToggleSwitch>

export const Default = () => {
  const field = 'toggleswitchDefault'
  const dispatch = useDispatch()
  const { toggleswitchDefault } = useSelector(settingsSelectors.current)
  return (
    <ToggleSwitch
      name={field}
      value={toggleswitchDefault as boolean}
      onChange={(val) => dispatch(settingsActions.set({ key: field, value: val }))}
    />
  )
}

export const Disabled = () => {
  const field = 'toggleswitchDefault'
  const dispatch = useDispatch()
  const { toggleswitchDefault } = useSelector(settingsSelectors.current)
  return (
    <ToggleSwitch
      name={field}
      value={toggleswitchDefault as boolean}
      disabled={true}
      onChange={(val) => dispatch(settingsActions.set({ key: field, value: val }))}
    />
  )
}

export const WithLabel = () => {
  const field = 'toggleswitchWithLabel'
  const dispatch = useDispatch()
  const { toggleswitchWithLabel } = useSelector(settingsSelectors.current)
  return (
    <ToggleSwitch
      name={field}
      value={toggleswitchWithLabel as boolean}
      label="This is the way"
      showActiveLabel={true}
      onChange={(val) => dispatch(settingsActions.set({ key: field, value: val }))}
    />
  )
}

export const WithLabelAndTitle = () => {
  const field = 'toggleswitchWithLabelAndTitle'
  const dispatch = useDispatch()
  const { toggleswitchWithLabelAndTitle } = useSelector(settingsSelectors.current)
  return (
    <ToggleSwitch
      name={field}
      value={toggleswitchWithLabelAndTitle as boolean}
      title="Some title"
      label="This is the way"
      showActiveLabel={true}
      onChange={(val) => dispatch(settingsActions.set({ key: field, value: val }))}
    />
  )
}

export const Box = () => {
  const field = 'toggleswitchBox'
  const dispatch = useDispatch()
  const { toggleswitchBox } = useSelector(settingsSelectors.current)
  return (
    <ToggleSwitch
      name={field}
      value={toggleswitchBox as boolean}
      layout="box"
      title="Box layout can have a title"
      description="Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. "
      onChange={(val) => dispatch(settingsActions.set({ key: field, value: val }))}
    />
  )
}

export default meta
