import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'

import AppRoot from './components/AppRoot'

import { store } from '@cardinalapps/ui/src/store'

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
        <BrowserRouter basename="/cinema">
          <AppRoot />
        </BrowserRouter>
      </Provider>,
    // </React.StrictMode>,
  )
} else {
  throw new Error("Could not find root element")
}
