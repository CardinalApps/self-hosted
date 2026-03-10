import { useSelector } from 'react-redux'
import clsx from 'clsx'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from './i18n.json'

import './styles.css'

type ReloadButtonProps = {
  onClick: () => void,
}

function ReloadButton({ onClick }: ReloadButtonProps) {
  const { lang } = useSelector(settingsSelectors.current)
  return (
    <button
      className={clsx('reloadButton', 'spin')}
      title={i18n['reload-button.title'][lang]}
      onClick={onClick}
    >
      <i className="fas fa-redo-alt" />
    </button>
  )
}

export default ReloadButton
