import type { Meta, StoryObj } from '@storybook/react'

import TextInputComponent from '../TextInput'
import NumberInputComponent from '../NumberInput'
import TextareaComponent from '../Textarea'
import ToggleSwitchComponent from '../ToggleSwitch'

import FormField from './FormField'

const meta = {
  title: 'Forms/FormField',
  component: FormField,
  argTypes: {},
} satisfies Meta<typeof FormField>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <form style={{ maxWidth: 300 }} onSubmit={() => {}}>
        <FormField
          label="This is the label"
          subText="Message"
        >
          <TextInputComponent type="text" placeholder="Placeholder" />
        </FormField>
      </form>
    ),
  },
}

export const Number: Story = {
  args: {
    children: (
      <form style={{ maxWidth: 300 }} onSubmit={() => {}}>
        <FormField
          label="This is the label"
          subText="Message"
        >
          <NumberInputComponent placeholder="Placeholder" />
        </FormField>
      </form>
    ),
  },
}

export const TextareaStory: Story = {
  args: {
    children: (
      <form style={{ maxWidth: 300 }} onSubmit={() => {}}>
        <FormField
          label="This is the label"
          subText="Message"
        >
          <TextareaComponent placeholder="Placeholder" />
        </FormField>
      </form>
    ),
  },
}

export const ToggleSwitch: Story = {
  args: {
    children: (
      <form style={{ maxWidth: 300 }} onSubmit={() => {}}>
        <FormField
          label="This is the label"
          subText="Message"
        >
          <ToggleSwitchComponent value1={'dog'} value2={'cat'} />
        </FormField>
      </form>
    ),
  },
}

export const WithError: Story = {
  args: {
    children: (
      <form style={{ maxWidth: 300 }} onSubmit={() => {}}>
        <FormField
          label="This is the label"
          subText="Message"
          error="Something has gone wrong"
        >
          <input type="text" placeholder="Placeholder" />
        </FormField>
      </form>
    ),
  },
}

export default meta
