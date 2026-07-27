import SettingsPanel from '@cardinalapps/ui/src/components/features/SettingsPanel'
import { CardinalApp } from '@cardinalapps/ui/src/lib/env/cardinal'

import './styles.css'

/**
 * Custom settings pages for the Media Server.
 */
function HomeServerSettingsPanel() {
  return (
    <SettingsPanel
      app={CardinalApp.ADMIN}
      lang="en"
    />
  )
}

export default HomeServerSettingsPanel
