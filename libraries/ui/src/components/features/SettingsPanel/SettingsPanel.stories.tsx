import type { Meta, StoryObj } from '@storybook/react'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'

import SettingsPanel from './SettingsPanel'
import Field from './Field'

import Button from '../../interaction/Button'
import ToggleSwitch from '../../forms/ToggleSwitch'
import { CardinalApp } from '../../../lib/env/cardinal'
import { layoutActions, layoutSelectors } from '../../../store/slices/layout'
import { SettingsObject } from '@cardinalapps/app-settings/src/types'

import '../AppBase/AppBase.css'

// Mirrors what AppBase does — keeps the SettingsPanel hidden until the user
// clicks "Open Settings", then renders it as a slide-up layer.
const SettingsPanelStoryHost = (args: React.ComponentProps<typeof SettingsPanel>) => {
  const dispatch = useDispatch()
  const settingsPanelOpen = useSelector(layoutSelectors.settingsPanelOpen)
  const settingsPanelTop = useSelector(layoutSelectors.settingsPanelTop)

  return (
    <div style={{ padding: 24 }}>
      <Button onClick={() => dispatch(layoutActions.setSettingsPanelOpen(true))} icon="fas fa-cog">
        Open Settings
      </Button>
      <AnimatePresence>
        {settingsPanelOpen && (
          <motion.div
            key="settings-panel-layer"
            className="settings-panel-layer"
            style={{ top: settingsPanelTop }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <SettingsPanel {...args} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const meta = {
  title: 'Feature/SettingsPanel',
  component: SettingsPanel,
  render: (args) => <SettingsPanelStoryHost {...args} />,
  argTypes: {},
} satisfies Meta<typeof SettingsPanel>
type Story = StoryObj<typeof meta>

export const MediaServer: Story = {
  args: {
    app: CardinalApp.ADMIN,
    lang: 'en',
  },
}

export const Music: Story = {
  args: {
    app: CardinalApp.MUSIC,
    lang: 'en',
  },
}

export const Photos: Story = {
  args: {
    app: CardinalApp.PHOTOS,
    lang: 'en',
  },
}

export const Cinema: Story = {
  args: {
    app: CardinalApp.CINEMA,
    lang: 'en',
  },
}

export const CustomTabs: Story = {
  args: {
    app: CardinalApp.ADMIN,
    lang: 'en',
    customTabs: [
      {
        tabName: 'Custom Tab',
        tabIcon: 'fas fa-home',
        tabContent: (
          <>
            <Field
              field={{
                label: 'Custom field 1',
                description: 'Custom description 1',
                type: 'toggle',
              } as SettingsObject}
            >
              <ToggleSwitch />
            </Field>
            <Field
              field={{
                label: 'Custom field 2',
                description: 'Custom description 2',
                type: 'toggle',
              } as SettingsObject}
            >
              <ToggleSwitch />
            </Field>
          </>
        ),
      },
    ],
  },
}

export default meta
