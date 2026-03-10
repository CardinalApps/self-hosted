import { useSelector } from 'react-redux'
import clsx from 'clsx'

import { layoutSelectors } from '../../../store/slices/layout'

const DirectoryTreeLayer = () => {
  const mobileFileBrowserIsOpen = useSelector(layoutSelectors.mobileFileBrowserIsOpen)
  return (
    <>
      <section
        id="file-browser-sidebar-portal"
        className={clsx('global-file-browser', !!mobileFileBrowserIsOpen && 'mobile-open')}
      />
    </>
  )
}

export default DirectoryTreeLayer
