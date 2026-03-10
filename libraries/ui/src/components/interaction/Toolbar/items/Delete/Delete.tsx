import { useSelector } from 'react-redux'

import { settingsSelectors } from '../../../../../store/slices/settings'

import i18n from './i18n'

import './Delete.css'
import { ToolbarItemProps, ToolbarItem } from '../../types'

export const SLUG = ToolbarItem.DELETE

interface DeleteProps extends ToolbarItemProps {
  onClick?: () => void,
}

const Delete = ({
  onClick = () => {},
}: DeleteProps) => {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <div className="delete">
      <button
        className="toolbar-button"
        title={i18n['title'][lang]}
        onClick={onClick}
      >
        <i className="toolbar-icon fas fa-trash-alt" />
      </button>
    </div>
  )
}

export default Delete
