import React from 'react'
import type { Preview } from "@storybook/react"

import { store } from '../src/store'
import ProviderWrapper from './Provider'

import '../public/styles/global.css'
import '../public/styles/fonts.css'
import '../public/styles/reset.css'
import '../public/styles/themes.css'
import '../public/styles/forms.css'
import '../public/styles/themes/Light.css'
import '../public/styles/themes/Dark.css'
import '../public/fonts/FontAwesome/css/all.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    cardinalTheme: {
      description: 'Cardinal app theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (Story, { context }) => {
      const theme = context?.globals?.cardinalTheme || 'light'
      return (
        <ProviderWrapper store={store}>
          <div className="app" data-theme={theme}>
            <Story />
          </div>
        </ProviderWrapper>
      )
    },
  ],
}

export default preview
