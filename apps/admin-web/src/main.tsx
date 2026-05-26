import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'

import AppRoot from './components/AppRoot'

import { store } from '@cardinalapps/ui/src/store'

// E2E test seam: lets Playwright drive Redux directly (mainly to replay `sse/*`
// events without standing up a real server-side EventSource). Gated on
// `VITE_E2E=true` so the symbol is absent from normal dev/prod builds.
if (import.meta.env.VITE_E2E === 'true') {
  (window as unknown as { __testDispatch: typeof store.dispatch }).__testDispatch = store.dispatch
}

import '@cardinalapps/ui/public/styles/global.css'
import '@cardinalapps/ui/public/styles/fonts.css'
import '@cardinalapps/ui/public/styles/reset.css'
import '@cardinalapps/ui/public/styles/themes.css'
import '@cardinalapps/ui/public/styles/forms.css'
import '@cardinalapps/ui/public/styles/themes/Light.css'
import '@cardinalapps/ui/public/styles/themes/Dark.css'
import '@cardinalapps/ui/public/fonts/FontAwesome/css/all.css'

const el = document.getElementById("root")
if (el) {
  const root = createRoot(el)
  root.render(
    // FIXME when strict mode is enabled, toasts cannot be cleared
    // <React.StrictMode>
      <Provider store={store}>
        <BrowserRouter basename="/admin">
          <AppRoot />
        </BrowserRouter>
      </Provider>,
    // </React.StrictMode>,
  )
} else {
  throw new Error("Could not find root element")
}
