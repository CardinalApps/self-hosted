import type { Meta, StoryObj } from '@storybook/react'

import ContextMenu from './ContextMenu'
import ContextMenuRightClickSurface from './ContextMenuRightClickSurface'
import ContextMenuDOMLayer from './ContextMenuDOMLayer'

const meta = {
  title: 'Interaction/ContextMenu',
  component: ContextMenu,
  argTypes: {},
} satisfies Meta<typeof ContextMenu>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    items: [
      {
        groupName: 'Cats',
        items: [
          {
            render: () => <span data-test="1">Tortie</span>,
            onClick: () => alert('Tortie'),
          },
          {
            label: 'Tuxedo',
            onClick: () => alert('Tuxedo'),
          },
        ],
      },
      {
        groupName: 'Dogs',
        items: [
          {
            label: 'Labrador',
            onClick: () => alert('Labrador'),
          },
          {
            label: 'Snoop',
            onClick: () => alert('Snoop'),
          },
          {
            label: 'Schnauzer',
            onClick: () => alert('Schnauzer'),
          },
          {
            label: 'Great Dane',
            onClick: () => alert('Great Dane'),
          },
        ],
      },
    ],
  },
}

export const onRightClick = () => {
  return (
    <ContextMenuRightClickSurface disabled={false}>
      <ContextMenuDOMLayer
        style={{ height: '100vh', width: '100vw', padding: 30, color: 'green' }}
        items={[
          {
            groupName: 'Mammals',
            items: [
              {
                render: () => <span data-test="1">Whale</span>,
                onClick: () => alert('Whale'),
              },
              {
                label: 'Monkey',
                onClick: () => alert('Monkey'),
              },
              {
                label: 'Bear',
                onClick: () => alert('Bear'),
              },
            ],
          },
        ]}
      >
        Background: Mammals
        <br />
        <br />
        (Hold cmd or ctrl to show group labels)

        <ContextMenuDOMLayer
          style={{ height: 500, width: 500, padding: 30, margin: 30, color: 'black', backgroundColor: 'lightblue' }}
          items={[
            {
              groupName: 'Cats',
              items: [
                {
                  render: () => <span data-test="1">Tortie</span>,
                  onClick: () => alert('Tortie'),
                },
                {
                  label: 'Tuxedo',
                  onClick: () => alert('Tuxedo'),
                },
              ],
            },
          ]}
        >
          Layer 1: Cats

          <ContextMenuDOMLayer
            style={{ height: 400, width: 400, padding: 30, margin: 30, color: 'black', backgroundColor: 'lightgreen' }}
            items={{
              groupName: 'Dogs',
              items: [
                {
                  label: 'Labrador',
                  onClick: () => alert('Labrador'),
                },
                {
                  label: 'Snoop',
                  onClick: () => alert('Snoop'),
                },
                {
                  label: 'Schnauzer',
                  onClick: () => alert('Schnauzer'),
                },
                {
                  label: 'Great Dane',
                  onClick: () => alert('Great Dane'),
                },
              ],
            }}
          >
            Layer 2: Dogs

            <ContextMenuDOMLayer
              style={{ height: 300, width: 300, padding: 30, margin: 30, color: 'black', backgroundColor: 'lightpink' }}
              items={{
                groupName: 'Birds',
                items: [
                  {
                    label: 'Cardinal',
                    onClick: () => alert('Cardinal'),
                  },
                  {
                    label: 'Blue Jay',
                    onClick: () => alert('Blue Jay'),
                  },
                  {
                    label: 'Sparrow',
                    onClick: () => alert('Sparrow'),
                  },
                ],
              }}
            >
              Layer 3: Birds

              <div style={{ height: 100, width: 200, padding: 30, margin: 30, color: 'black', backgroundColor: 'lightyellow' }}>
                Layer 4: div with nothing, allows passthrough
              </div>
            </ContextMenuDOMLayer>
          </ContextMenuDOMLayer>
        </ContextMenuDOMLayer>
      </ContextMenuDOMLayer>
    </ContextMenuRightClickSurface>
  )
}

export default meta
