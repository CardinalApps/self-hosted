import { ACCENT_COLOR_SLUG, accentColorFactory } from './accent_color'
import { AUTO_CHECK_FOR_UPDATES_SLUG, autoCheckForUpdateFactory } from './auto_check_for_updates'
import { CUSTOM_CSS_SLUG, customCSSFactory } from './custom_css'
import { CUSTOM_THEMES_SLUG, customThemesFactory } from './custom_themes'
import { DEVELOPER_MODE_SLUG, developerModeFactory } from './developer_mode'
import { ENABLE_CUSTOM_CONTEXT_MENU_SLUG, enableCustomContextMenuFactory } from './enable_custom_context_menu'
import { ENABLE_GLASS, enableGlassFactory } from './enable_glass'
import { FLOATING_PLAYBACK_SIDEBAR, floatingPlaybackSidebarFactory } from './floating_playback_sidebar'
import { LANG_SLUG, langFactory } from './lang'
import { NOTIFICATIONS_SLUG, notificationsFactory } from './notifications'
import { START_PAGE_SLUG, startPageFactory } from './start_page'
import { THEME_SLUG, themeFactory } from './theme'
import { THEME_OVERRIDES_SLUG, themeOverridesFactory } from './theme_overrides'
import { TELEMETRY_SLUG, telemetryFactory } from '../common/telemetry'
import { OPEN_APPS_IN_NEW_TAB_SLUG, openAppsInNewTabFactory } from '../common/open_apps_in_new_tab'

export const commonFields = {
  [ACCENT_COLOR_SLUG]: accentColorFactory,
  [CUSTOM_CSS_SLUG]: customCSSFactory,
  [CUSTOM_THEMES_SLUG]: customThemesFactory,
  [AUTO_CHECK_FOR_UPDATES_SLUG]: autoCheckForUpdateFactory,
  [DEVELOPER_MODE_SLUG]: developerModeFactory,
  [ENABLE_CUSTOM_CONTEXT_MENU_SLUG]: enableCustomContextMenuFactory,
  [ENABLE_GLASS]: enableGlassFactory,
  [FLOATING_PLAYBACK_SIDEBAR]: floatingPlaybackSidebarFactory,
  [LANG_SLUG]: langFactory,
  [NOTIFICATIONS_SLUG]: notificationsFactory,
  [START_PAGE_SLUG]: startPageFactory,
  [THEME_SLUG]: themeFactory,
  [THEME_OVERRIDES_SLUG]: themeOverridesFactory,
  [TELEMETRY_SLUG]: telemetryFactory,
  [OPEN_APPS_IN_NEW_TAB_SLUG]: openAppsInNewTabFactory,
}
