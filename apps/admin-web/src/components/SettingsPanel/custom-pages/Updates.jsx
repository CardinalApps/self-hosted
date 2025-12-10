import { useSelector, useDispatch } from 'react-redux'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import setSetting from '@cardinalapps/ui/src/store/slices/settings/thunks/set'
import Field from '@cardinalapps/ui/src/components/features/SettingsPanel/Field'
import autoCheckForUpdatesFieldFactory from '@cardinalapps/ui/src/components/features/SettingsPanel/fields/admin/autoCheckForUpdates'

import i18n from '../i18n.json'

/**
 * Custom settings pages for the Media Server.
 */
function Updates() {
  const dispatch = useDispatch()
  const { lang, auto_check_for_updates } = useSelector(settingsSelectors.current)
  const autoCheckForUpdatesField = autoCheckForUpdatesFieldFactory('admin', lang)

  return (
    <>
      <Field label={i18n['updates.tab.name'][lang]}>
        {autoCheckForUpdatesField.render({
          value: auto_check_for_updates,
          onChange: (v) => dispatch(setSetting({
            settings: {
              auto_check_for_updates: v,
            },
            app: 'admin',
          })),
        })}
      </Field>
    </>
  )
}

export default Updates
