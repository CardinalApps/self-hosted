import { Repository } from 'typeorm'

export type OptionNameType = string
export type OptionValueType = string | boolean | undefined | null

export type OptionsObjectType = {
  [name: OptionNameType]: OptionValueType,
}

export type MassInsertOptions = {
  data: Record<string, unknown>[],
  repository: Repository<unknown>,
}
