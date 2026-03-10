import { ENABLE_OIDC_BETA, enableOidcBetaFactory } from './enable_oidc_beta'
import { ACCENT_COLOR_SLUG, accentColorFactory } from './accent_color'
import { AUTO_CHECK_FOR_UPDATES_SLUG, autoCheckForUpdateFactory } from './auto_check_for_updates'
import { CUSTOM_CSS_SLUG, customCSSFactory } from './custom_css'
import { DEVELOPER_MODE_SLUG, developerModeFactory } from './developer_mode'
import { ENABLE_CUSTOM_CONTEXT_MENU_SLUG, enableCustomContextMenuFactory } from './enable_custom_context_menu'
import { LANG_SLUG, langFactory } from './lang'
import { NOTIFICATIONS_SLUG, notificationsFactory } from './notifications'
import { START_PAGE_SLUG, startPageFactory } from './start_page'
import { THEME_SLUG, themeFactory } from './theme'
import { TELEMETRY_SLUG, telemetryFactory } from '../common/telemetry'
import { OPEN_APPS_IN_NEW_TAB_SLUG, openAppsInNewTabFactory } from '../common/open_apps_in_new_tab'

export const commonFields = {
  [ENABLE_OIDC_BETA]: enableOidcBetaFactory,
  [ACCENT_COLOR_SLUG]: accentColorFactory,
  [CUSTOM_CSS_SLUG]: customCSSFactory,
  [AUTO_CHECK_FOR_UPDATES_SLUG]: autoCheckForUpdateFactory,
  [DEVELOPER_MODE_SLUG]: developerModeFactory,
  [ENABLE_CUSTOM_CONTEXT_MENU_SLUG]: enableCustomContextMenuFactory,
  [LANG_SLUG]: langFactory,
  [NOTIFICATIONS_SLUG]: notificationsFactory,
  [START_PAGE_SLUG]: startPageFactory,
  [THEME_SLUG]: themeFactory,
  [TELEMETRY_SLUG]: telemetryFactory,
  [OPEN_APPS_IN_NEW_TAB_SLUG]: openAppsInNewTabFactory,
}
