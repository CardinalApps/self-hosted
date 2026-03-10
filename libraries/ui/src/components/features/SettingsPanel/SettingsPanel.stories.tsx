import type { Meta, StoryObj } from '@storybook/react'

import SettingsPanel from './SettingsPanel'
import Field from './Field'

import ToggleSwitch from '../../forms/ToggleSwitch'
import { CardinalApp } from '../../../lib/env/cardinal'
import { SettingsObject } from '@cardinalapps/app-settings/src/types'

const meta = {
  title: 'Feature/SettingsPanel',
  component: SettingsPanel,
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
