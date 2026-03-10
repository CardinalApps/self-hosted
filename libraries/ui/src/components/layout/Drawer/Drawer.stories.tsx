import { useState } from 'react'
import type { Meta } from '@storybook/react'

import Drawer from './Drawer'
import DrawerLayer from './DrawerLayer'
import Button from '../../interaction/Button'
import WrittenText from '../../typography/WrittenText'

const meta = {
  title: 'Layout/Drawer',
  component: Drawer,
  argTypes: {},
} satisfies Meta<typeof Drawer>
//type Story = StoryObj<typeof meta>

export const SmallContent = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <DrawerLayer />
      <div style={{ display: 'flex', gap: 15 }}>
        <Button onClick={() => setIsOpen(true)}>
          Open drawer
        </Button>
      </div>
      {isOpen &&
        <Drawer
          title="Some Drawer"
          subtitle="This is a subtitle"
          onClose={() => setIsOpen(false)}
        >
          <WrittenText>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <Button onClick={() => setIsOpen(false)}>Close drawer</Button>
          </WrittenText>
        </Drawer>
      }
    </div>
  )
}

export const BigContent = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <DrawerLayer />
      <div style={{ display: 'flex', gap: 15 }}>
        <Button onClick={() => setIsOpen(true)}>
          Open drawer
        </Button>
      </div>
      {isOpen &&
        <Drawer
          width={800}
          title="Some Drawer"
          onClose={() => setIsOpen(false)}
        >
          <WrittenText>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <Button onClick={() => setIsOpen(false)}>Close drawer</Button>
          </WrittenText>
        </Drawer>
      }
    </div>
  )
}

export const Loading = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <DrawerLayer />
      <div style={{ display: 'flex', gap: 15 }}>
        <Button onClick={() => setIsOpen(true)}>
          Open drawer
        </Button>
      </div>
      {isOpen &&
        <Drawer loading={true} onClose={() => setIsOpen(false)}>
          <WrittenText>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas egestas dictum commodo. Cras egestas massa in convallis tincidunt. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus pretium dui tempor feugiat fringilla. Etiam nec imperdiet lectus, varius consectetur ex. Aliquam dolor sapien, malesuada ut iaculis vel, rutrum eleifend lorem. Maecenas gravida arcu non orci sodales aliquet facilisis a risus. Aenean gravida nisl tellus, id pulvinar velit cursus vitae. Vivamus tempus congue aliquam. Sed convallis tincidunt rutrum. Phasellus eu vulputate dolor. Nullam dolor urna, viverra at enim vel, feugiat venenatis dui.</p>
            <Button onClick={() => setIsOpen(false)}>Close drawer</Button>
          </WrittenText>
        </Drawer>
      }
    </div>
  )
}

export default meta
