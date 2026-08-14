export enum SettingsEvents {
  CHANGED = `settings.changed`,
}

export type SettingsChangedEventPayload = {
  names: string[],
}
