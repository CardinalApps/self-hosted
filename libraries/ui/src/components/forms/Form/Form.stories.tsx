import type { Meta, StoryObj } from '@storybook/react'

import Button from '../../interaction/Button'
import FormField from '../FormField'
import TextInput from '../TextInput'

import Form from './Form'

const meta = {
  title: 'Forms/Form',
  component: Form,
  argTypes: {},
} satisfies Meta<typeof Form>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Form Title',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam lacus odio, pretium congue risus eu, accumsan egestas sapien. Nulla feugiat metus nisl, ac consectetur tellus volutpat nec. Aliquam hendrerit gravida accumsan. Sed consectetur a urna sit amet accumsan. Quisque tellus eros, porta eu hendrerit eget, sodales porttitor odio. Cras eu rutrum risus. In sit amet erat gravida, rhoncus nisi vel, pharetra velit.',
    controls: (
      <>
        <Button type="reset">Reset</Button>
        <Button type="submit">Submit</Button>
      </>
    ),
    controlsAlign: 'flex-end',
    children: (
      <FormField>
        <TextInput type="text" placeholder="Placeholder" />
      </FormField>
    ),
  },
}

export default meta
