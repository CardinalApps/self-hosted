/**
 * @file For client side routing.
 */

import { slug } from "./slugify"

export enum BasePaths {
  admin = '/admin',
  music = '/music',
  photos = '/photos',
  cinema = '/cinema',
}

export enum AdminRoutes {
  root                        = '/',
  first_time_setup            = '/setup',
  login                       = '/login',
  settings                    = '/settings',
  users                       = '/users',
  roles                       = '/roles',
  indexing                    = '/indexing',
  jobs                        = '/jobs',
  libraries                   = '/libraries',
}

export enum MusicRoutes {
  root                        = '/',
  login                       = '/login',
  settings                    = '/settings',
  artists                     = '/artists',
  artist                      = '/artists/:id',
  releases                    = '/releases',
  release                     = '/releases/:id',
  tracks                      = '/tracks',
  history                     = '/history',
  playlists                   = '/playlists',
}

export enum PhotoRoutes {
  root                        = '/',
  login                       = '/login',
  settings                    = '/settings',
  photo                       = '/:id',
  photo_albums                = '/albums',
  photo_album                 = '/albums/:id',
  people                      = '/people',
  locations                   = '/world-map',
}

export enum CinemaRoutes {
  root                        = '/',
  login                       = '/login',
  settings                    = '/settings',
  movies                      = '/movies',
  tv                          = '/tv',
  channels                    = '/channels',
  playlists                   = '/playlists',
  libraries                   = '/libraries',
  history                     = '/history',
}

/**
 * Returns a URL for any Cardinal app. If no app is sepcified in the options,
 * the current app will be used.
 * 
 * Params are set like...
 * 
 *     {
 *       ':userId': '123'
 *     }
 * 
 * on a route like...
 * 
 *     /users/:userId
 * 
 * to return a URL like...
 * 
 *     /users/123
 */
export const getAppUrl = (
  route: keyof typeof AdminRoutes | keyof typeof MusicRoutes | keyof typeof PhotoRoutes | keyof typeof CinemaRoutes,
  options?: {
    app?: keyof typeof BasePaths,
    params?: Record<string, string>,
  },
): string => {
  let path = ''
  let app = options?.app

  // Get app based on current URL
  if (!app) {
    const currentUrlBase = window?.location?.pathname?.split('/')?.[1]
    if (currentUrlBase in BasePaths) {
      app = currentUrlBase as keyof typeof BasePaths
    }
  }

  switch (app) {
    case 'admin':
      path = AdminRoutes[route]
      break
    case 'music':
      path = MusicRoutes[route]
      break
    case 'photos':
      path = PhotoRoutes[route]
      break
    case 'cinema':
      path = CinemaRoutes[route]
      break
  }

  // Only add the app prefix if the app is explicitly given in the options
  let url = options?.app
    ? `${BasePaths[options?.app]}/${path}`
    : `${path}`

  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (url.includes(key)) {
        url = url.replace(key, slug(value))
      }
    }
  }

  return url
}
