import { AllSettingsSlugs } from '@cardinalapps/app-settings/dist/cjs'

export type SettingName = AllSettingsSlugs
export type SettingValue =
  string |
  number |
  boolean |
  undefined |
  null |
  // eg. the saved custom themes, stored as JSON
  unknown[] |
  Record<string, unknown>

export type SettingsObject = {
  [K in SettingName]?: SettingValue;
}
