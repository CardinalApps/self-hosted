import { MediaServerCapability } from "@cardinalapps/access-control/dist/cjs"
import { CardinalApp } from "../../utils/apps"

/**
 * Each app and their associated login capability.
 */
export const APP_LOGIN_CAPABILITY: Record<CardinalApp, MediaServerCapability> = {
  admin: 'AdminApp.Login',
  music: 'MusicApp.Login',
  photos: 'PhotosApp.Login',
  cinema: 'CinemaApp.Login',
} as const
