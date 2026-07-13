import { useAppDispatch } from '../../../../hooks/useAppDispatch'
import { useAppSelector } from '../../../../hooks/useAppSelector'
import { layoutActions, layoutSelectors } from '../../../../store/slices/layout'
import { settingsSelectors } from '../../../../store/slices/settings'

import Icon from '../../../typography/Icon'

import i18n from '../i18n'

/**
 * Opens and closes the playback sidebar.
 */
const PlaybackSidebarIcon = () => {
  const dispatch = useAppDispatch()
  const { lang } = useAppSelector(settingsSelectors.current)
  const open = useAppSelector(layoutSelectors.playbackSidebarOpen)

  return (
    <Icon
      fa="fas fa-compact-disc"
      className="playback-sidebar-icon"
      title={open ? i18n['playback-sidebar-icon.close'][lang] : i18n['playback-sidebar-icon.open'][lang]}
      style={open ? { color: 'var(--accent-color)' } : undefined}
      onClick={() => dispatch(layoutActions.togglePlaybackSidebar())}
    />
  )
}

export default PlaybackSidebarIcon
