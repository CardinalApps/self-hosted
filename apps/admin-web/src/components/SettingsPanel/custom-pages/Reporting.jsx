import { useSelector, useDispatch } from 'react-redux'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import telemetryField from '@cardinalapps/ui/src/components/features/SettingsPanel/fields/admin/telemetry'
import setSetting from '@cardinalapps/ui/src/store/slices/settings/thunks/set'

/**
 * Custom settings page for the Media Server.
 */
function Telemetry() {
  const dispatch = useDispatch()
  const { lang, telemetry } = useSelector(settingsSelectors.current)
  const telemetryFieldFactory = telemetryField('admin', lang)

  return (
    <div className={'reporting'}>
      <div className="settings-input">
        {telemetryFieldFactory.render({
          value: telemetry,
          onChange: (v) => dispatch(setSetting({
            settings: {
              telemetry: v,
            },
            app: null,
          })),
        })}
      </div>
    </div>
  )
}

export default Telemetry
