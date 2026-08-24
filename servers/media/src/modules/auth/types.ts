import { MediaServerCapability } from "@cardinalapps/access-control/dist/cjs"
import { CardinalApp } from "../../utils/apps"

/*
 * Codes that travel in the body of a refused request. A cloud-linked account holds two credentials,
 * and a client that cannot tell which of them was refused ends up throwing away both.
 */
export const AUTH_ERROR_CODE = {
  CLOUD_TOKEN_REQUIRED: 'cloud_token_required',
  CLOUD_UNAVAILABLE: 'cloud_unavailable',
} as const

/**
 * Each app and their associated login capability.
 */
export const APP_LOGIN_CAPABILITY: Record<CardinalApp, MediaServerCapability> = {
  admin: 'AdminApp.Login',
  music: 'MusicApp.Login',
  photos: 'PhotosApp.Login',
  cinema: 'CinemaApp.Login',
} as const
