import { useSelector } from 'react-redux'

import { settingsSelectors } from '../../../../../store/slices/settings'

import { ToolbarItemProps, ToolbarItem } from '../../types'

import i18n from './i18n'

import './Deselect.css'

export const SLUG = ToolbarItem.DESELECT

interface DeselectProps extends ToolbarItemProps {
  onClick?: () => void,
}

const Deselect = ({
  onClick = () => {},
}: DeselectProps) => {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <div className="deselect">
      <button
        className="toolbar-button"
        title={i18n['title'][lang]}
        onClick={onClick}
      >
        <i className="toolbar-icon fas fa-times" />
      </button>
    </div>
  )
}

export default Deselect
