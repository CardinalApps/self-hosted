import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'
import DynamicQueueActionButton from '../../../components/DynamicQueueActionButton'

// Starts a queue of never-ending randomized playback
function TrueShuffle() {
  const { lang } = useAppSelector(settingsSelectors.current)

  return (
    <DynamicQueueActionButton
      dynamicQueueType="true_shuffle"
      icon="fas fa-random"
      label={i18n['action-buttons.true-shuffle'][lang]}
      labelAs="h2"
    />
  )
}

export default TrueShuffle
