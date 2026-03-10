import { AllSettingsSlugs } from '@cardinalapps/app-settings/dist/cjs'

export type SettingName = AllSettingsSlugs
export type SettingValue = string | boolean | undefined | null

export type SettingsObject = {
  [K in SettingName]?: SettingValue;
}
