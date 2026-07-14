import { useAppDispatch } from '../../../../hooks/useAppDispatch'
import { useAppSelector } from '../../../../hooks/useAppSelector'
import { layoutActions, layoutSelectors } from '../../../../store/slices/layout'
import { settingsSelectors } from '../../../../store/slices/settings'

import MenuButton from '../../../interaction/MenuButton'
import Icon from '../../../typography/Icon'

import i18n from '../i18n'

/**
 * Opens and closes the playback sidebar.
 *
 * It drops no menu of its own, but it sits among the header's other icons, so it is
 * built from the same button as them. The sidebar's state lives in the store, so the
 * button is told whether it is open rather than working it out itself.
 */
const PlaybackSidebarIcon = () => {
  const dispatch = useAppDispatch()
  const { lang } = useAppSelector(settingsSelectors.current)
  const open = useAppSelector(layoutSelectors.playbackSidebarOpen)

  return (
    <MenuButton
      className="playback-sidebar-icon"
      solid={false}
      size="m"
      align="center"
      title={open ? i18n['playback-sidebar-icon.close'][lang] : i18n['playback-sidebar-icon.open'][lang]}
      icon={<Icon fa="fas fa-columns" />}
      open={open}
      onOpenChange={() => dispatch(layoutActions.togglePlaybackSidebar())}
    />
  )
}

export default PlaybackSidebarIcon
