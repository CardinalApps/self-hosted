import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'
import MixButton from '../../../components/MixButton'

// Starts a mix seeded by the server from recent heavy rotation, or a favorite
function HouseMix() {
  const { lang } = useAppSelector(settingsSelectors.current)

  return (
    <MixButton
      dynamicQueueType="house_mix"
      icon="fas fa-dna"
      label={i18n['action-buttons.house-mix'][lang]}
    />
  )
}

export default HouseMix
