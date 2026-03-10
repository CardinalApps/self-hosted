import { useSelector, useDispatch } from 'react-redux'

import Button from '../Button'

import { settingsSelectors } from '../../../store/slices/settings'
import { layoutSelectors, layoutActions } from '../../../store/slices/layout'

import i18n from './i18n'

const DirectoryTreeMobileButton = () => {
  const dispatch = useDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const mobileFileBrowserIsOpen = useSelector(layoutSelectors.mobileFileBrowserIsOpen)
  return (
    <div id="file-browser-mobile-controls">
      <Button tag onClick={() => dispatch(layoutActions.setMobileFileBrowserIsOpen(!mobileFileBrowserIsOpen))}>
        {i18n['mobile-toggle-label'][lang]}
      </Button>
    </div>
  )
}

export default DirectoryTreeMobileButton
