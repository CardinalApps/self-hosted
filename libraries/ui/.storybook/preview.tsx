import React, { useEffect, useRef } from 'react'
import type { Preview } from "@storybook/react"
import { useDispatch } from 'react-redux'

import { store } from '../src/store'
import { settingsActions } from '../src/store/slices/settings'
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

// Mirrors AppBase: the settings store decides data-theme and the applied theme
// variables, so store-dispatched theme changes (eg. the theme editor's switcher)
// live-preview in stories. Toolbar picks are forwarded into the store.
const ThemedStoryFrame = ({ toolbarTheme, children }: { toolbarTheme?: string, children: React.ReactNode }) => {
  const dispatch = useDispatch()
  const frameRef = useRef<HTMLDivElement>(null)
  const { resolvedBaseTheme } = useAppliedTheme(frameRef)

  useEffect(() => {
    if (toolbarTheme) {
      dispatch(settingsActions.set({ key: 'theme', value: toolbarTheme }))
    }
  }, [toolbarTheme])

  return (
    <div ref={frameRef} className="app" data-theme={resolvedBaseTheme || 'light'}>
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
      return (
        <ProviderWrapper store={store}>
          <ThemedStoryFrame toolbarTheme={context?.globals?.cardinalTheme}>
            <Story />
          </ThemedStoryFrame>
        </ProviderWrapper>
      )
    },
  ],
}

export default preview
