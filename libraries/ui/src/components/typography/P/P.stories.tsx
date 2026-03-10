import type { Meta, StoryObj } from '@storybook/react'

import P from './P'

const meta = {
  title: 'Typography/P',
  component: P,
  argTypes: {},
} satisfies Meta<typeof P>
type Story = StoryObj<typeof meta>

export const Single: Story = {
  args: {
    children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam vitae venenatis dui. Aenean augue leo, pellentesque dapibus massa id, faucibus porta magna. Fusce sagittis justo eu urna volutpat sodales. Aenean nisi felis, facilisis non condimentum ac, sodales eget nulla. Etiam dignissim, leo bibendum dignissim ultricies, elit velit feugiat leo, id ultrices sem dolor fringilla risus. Sed volutpat vel enim a commodo. Nulla lobortis gravida massa vitae congue. Vivamus a convallis eros, vestibulum viverra nibh.',
  },
}

export const Multiple = () => {
  return (
    <div style={{ maxWidth: 600 }}>
      <P>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam vitae venenatis dui. Aenean augue leo, pellentesque dapibus massa id, faucibus porta magna. Fusce sagittis justo eu urna volutpat sodales. Aenean nisi felis, facilisis non condimentum ac, sodales eget nulla. Etiam dignissim, leo bibendum dignissim ultricies, elit velit feugiat leo, id ultrices sem dolor fringilla risus. Sed volutpat vel enim a commodo. Nulla lobortis gravida massa vitae congue. Vivamus a convallis eros, vestibulum viverra nibh.</P>
      <P>Donec nec ipsum nec tortor laoreet dignissim laoreet quis odio. Phasellus dignissim interdum sagittis. Nam porttitor, augue quis rhoncus cursus, turpis lectus finibus magna, vel auctor erat tortor non leo. Pellentesque ornare consectetur quam eu ultricies. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales quis nulla in porttitor. Pellentesque tristique fringilla finibus. Nunc sodales ut ligula id ultrices. Sed iaculis quam sed efficitur venenatis. Interdum et malesuada fames ac ante ipsum primis in faucibus. Cras euismod non felis convallis pulvinar. Duis turpis ligula, vestibulum a fringilla a, bibendum eu quam. Mauris eu dolor scelerisque, maximus magna sed, ultricies lectus.</P>
      <P>Nunc faucibus feugiat blandit. Vestibulum metus sapien, mattis ac pulvinar nec, consectetur molestie enim. Etiam nec facilisis turpis. Nullam eu elit ac sem varius dapibus sit amet in mi. Cras et porttitor purus, sed semper nibh. Nulla eros nulla, dapibus id justo eu, dapibus finibus magna. Etiam lobortis laoreet ante, bibendum ultrices risus congue ac. Sed posuere elit eget erat imperdiet porta. Fusce nec est nisl. Fusce commodo porttitor nibh. Sed vel mauris sed magna scelerisque posuere.</P>
      <P>Ut egestas dictum ligula. In hac habitasse platea dictumst. Duis rhoncus euismod diam, eu luctus mi tincidunt eget. Sed molestie, justo vel iaculis pretium, purus lacus imperdiet lacus, at varius elit dolor vitae libero. In blandit, tortor in venenatis porta, nulla mauris varius ipsum, scelerisque hendrerit nunc tortor et dui. Vivamus hendrerit, neque ut lacinia tempor, leo enim egestas urna, in consequat urna urna ac est. Morbi convallis pretium nulla, gravida tempus quam gravida sit amet. Nulla lobortis tortor vel urna venenatis volutpat. Nunc nec eros eget nisl porttitor accumsan. Morbi dictum aliquet quam, ut luctus nisl sollicitudin at.</P>
      <P>Mauris id purus ut mauris tempus efficitur. Pellentesque dolor erat, iaculis at sodales viverra, aliquam eu ipsum. Curabitur a mattis nulla, nec blandit lorem. Suspendisse consequat metus tortor, vitae cursus lacus fringilla eu. Nulla eu enim nunc. Suspendisse venenatis massa sed erat tincidunt, quis consectetur orci ullamcorper. Morbi a lectus ut magna vehicula ornare. Ut congue nunc non efficitur accumsan. In fringilla hendrerit magna, a facilisis arcu laoreet sed. Proin rhoncus sit amet diam sed convallis. Suspendisse potenti. Fusce pharetra tincidunt nulla, non mattis lorem aliquet vitae. Etiam dapibus congue tortor, vel auctor magna feugiat nec. In hac habitasse platea dictumst. Etiam ut ligula et lorem interdum tristique sit amet et magna. Etiam non vulputate felis.</P>
    </div>
  )
}

export default meta
