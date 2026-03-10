export type SupportedCardinalApp =
  'admin' |
  'music' |
  'photos' |
  'cinema' |
  'books'

export type SupportedLang = 'en'

export type InputType =
  'select' |
  'toggle' |
  'text' |
  'textArea' |
  'number' |
  'swatches'

export type InputValue =
  string |
  boolean |
  number |
  InputValue[] |
  Record<string, unknown> |
  undefined |
  null

export type StorageLocation =
  'client' | // TODO
  'home_server'

export type SettingsObject = {
  slug: string
  label: string
  type: InputType
  storage: StorageLocation
  options?: Record<string | number | symbol, unknown> | unknown[] | string
  defaultValue?: string | number | unknown[] | object | null | undefined | boolean
  description?: string

  // these callbacks will be given the current input value, and can modify it
  // before returning it
  beforeChange?: (value: InputValue) => InputValue | void
  afterChange?: (value: InputValue) => InputValue | void
}

export type SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => SettingsObject
