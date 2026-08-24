import { useSelector } from 'react-redux'

import SettingsPanel from '@cardinalapps/ui/src/components/features/SettingsPanel'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { CardinalApp } from '@cardinalapps/ui/src/lib/env/cardinal'

/**
 * Custom settings pages for the Media Server.
 */
function HomeServerSettingsPanel() {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <SettingsPanel
      app={CardinalApp.PHOTOS}
      lang={lang}
    />
  )
}

export default HomeServerSettingsPanel
