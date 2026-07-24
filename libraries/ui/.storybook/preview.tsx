import React, { useRef } from 'react'
import type { Preview } from "@storybook/react"

import { store } from '../src/store'
import useAppliedTheme from '../src/hooks/useAppliedTheme'
import ProviderWrapper from './Provider'

import '../public/styles/global.css'
import '../public/styles/fonts.css'
import '../public/styles/reset.css'
import '../public/styles/themes.css'
import '../public/styles/forms.css'
import '../public/styles/themes/Light.css'
import '../public/styles/themes/Dark.css'
import '../public/fonts/FontAwesome/css/all.css'

// Mirrors AppBase: carries data-theme and the applied theme variables so theme
// settings (accent, custom themes, overrides) live-preview in stories. The
// toolbar still decides light/dark.
const ThemedStoryFrame = ({ theme, children }: { theme: string, children: React.ReactNode }) => {
  const frameRef = useRef<HTMLDivElement>(null)
  useAppliedTheme(frameRef)

  return (
    <div ref={frameRef} className="app" data-theme={theme}>
      {children}
    </div>
  )
}

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
          <ThemedStoryFrame theme={theme}>
            <Story />
          </ThemedStoryFrame>
        </ProviderWrapper>
      )
    },
  ],
}

export default preview
