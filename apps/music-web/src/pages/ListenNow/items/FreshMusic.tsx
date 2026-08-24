import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'
import DynamicQueueActionButton from '../../../components/DynamicQueueActionButton'
import { useHasFreshMusic } from '../../../hooks/useHasFreshMusic'

/**
 * Starts a queue of music released in real life within the fresh window,
 * according to the files' metadata. Disabled when the library has none.
 */
function FreshMusic() {
  const { lang } = useAppSelector(settingsSelectors.current)
  const hasFreshMusic = useHasFreshMusic()

  return (
    <DynamicQueueActionButton
      dynamicQueueType="fresh_music"
      icon="fas fa-seedling"
      disabled={!hasFreshMusic}
      label={i18n['action-buttons.fresh-music'][lang]}
      labelAs="h2"
    />
  )
}

export default FreshMusic
