import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'
import DynamicQueueActionButton from '../../../components/DynamicQueueActionButton'
import { useHasFreshMusic } from '../../../hooks/useHasFreshMusic'

/**
 * Plays one random release that came out in real life within the fresh window,
 * front to back. Disabled when the library has no fresh music.
 */
function FreshRelease() {
  const { lang } = useAppSelector(settingsSelectors.current)
  const hasFreshMusic = useHasFreshMusic()

  return (
    <DynamicQueueActionButton
      dynamicQueueType="fresh_release"
      icon="fas fa-leaf"
      disabled={!hasFreshMusic}
      label={i18n['action-buttons.fresh-release'][lang]}
    />
  )
}

export default FreshRelease
