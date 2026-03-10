import type { Meta, StoryObj } from '@storybook/react'

import WrittenText from './WrittenText'

const meta = {
  title: 'Typography/WrittenText',
  component: WrittenText,
  argTypes: {},
} satisfies Meta<typeof WrittenText>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: `
      <h1>The quick red Cardinal jumped over the lazy dog</h1>
      <h2>The quick red Cardinal jumped over the lazy dog</h2>
      <h3>The quick red Cardinal jumped over the lazy dog</h3>
      <h4>The quick red Cardinal jumped over the lazy dog</h4>
      <h5>The quick red Cardinal jumped over the lazy dog</h5>
      <h6>The quick red Cardinal jumped over the lazy dog</h6>

      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam lacus odio, pretium congue risus eu, accumsan egestas sapien. Nulla feugiat metus nisl, ac consectetur tellus volutpat nec. Aliquam hendrerit gravida accumsan. Sed consectetur a urna sit amet accumsan. Quisque tellus eros, porta eu hendrerit eget, sodales porttitor odio. Cras eu rutrum risus. In sit amet erat gravida, rhoncus nisi vel, pharetra velit.</p>
      <code>
      function example() {
        return 'Help I'm alive'
      }
      </code>
      <p><strong>Quisque ac egestas lectus.</strong> Etiam <a href="#" target="_blank">sagittis porta</a> condimentum. Suspendisse ornare feugiat erat et placerat. Duis eget aliquam ex. Donec quis sollicitudin tortor. Ut felis tellus, cursus nec ipsum consectetur, dapibus sollicitudin tortor. Aenean efficitur suscipit mauris sit amet dignissim.</p>
      <p><em>Mauris convallis dictum eros, ac interdum metus tristique vel. Praesent mi risus, tincidunt a ipsum ut, vehicula ultricies orci. Vivamus risus turpis, tempor semper sollicitudin ac, condimentum quis quam. Aenean eu hendrerit elit.</em> Suspendisse luctus facilisis vestibulum. Donec faucibus nunc sodales, finibus elit eget, lacinia nibh. Proin in dolor blandit, fermentum erat eget, accumsan nibh. Fusce sed sem sodales, accumsan odio sit amet, porta augue. Vestibulum in lectus ipsum. Mauris tempus accumsan placerat. Integer nec feugiat velit. In hac habitasse platea dictumst. Vestibulum bibendum nulla ex, vitae dictum quam ultricies in.</p>
      <p>Suspendisse ornare feugiat erat et placerat. <code>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam lacus odio.</code> Suspendisse ornare feugiat erat et placerat.</p>
      
      <div class="arrow-link"><a href="#">Arrow link example</a></div>

      <ul>
        <li>Milk</li>
        <li>
          Eggs
          <ul>
            <li>Large</li>
            <li>Free range</li>
          </ul>
        </li>
        <li>
          Bread
          <ul>
            <li>Cynaide</li>
            <li>Orange juice</li>
            <li>Pepsi</li>
          </ul>
        </li>
        <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam lacus odio, pretium congue risus eu, accumsan egestas sapien. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam lacus odio, pretium congue risus eu, accumsan egestas sapien.</li>
        <li>Cheese</li>
      </ul>
      
      <ol>
        <li>Milk</li>
        <li>Eggs</li>
        <li>Bread</li>
        <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam lacus odio, pretium congue risus eu, accumsan egestas sapien. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam lacus odio, pretium congue risus eu, accumsan egestas sapien.</li>
        <li>Cheese</li>
        <li><code>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam lacus odio.</code></li>
      </ol>

      <img src="/images/1.jpg" alt="Test image">
    `,
  },
}

export default meta
