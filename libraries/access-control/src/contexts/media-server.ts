import { CapabilityAssignments, CapabilityAssignment } from "../capabilities"
import { Role } from "../roles"

/**
 * Master list of all aspects.
 */
export const MediaServerAspects = [
  'CurrentUser',
  'AdminApp',
  'Users',
  'Invitations',
  'RoleAssignments',
  'Indexing',
  'Jobs',
  'Libraries',
  'MusicApp',
  'MusicArtists',
  'MusicReleases',
  'MusicGenres',
  'MusicTracks',
  'MusicHistory',
  'PhotosApp',
  'Photos',
  'PhotoFaces',
  'PhotoAlbums',
  'CinemaApp',
  'TVChannels',
  'CinemaHistory',
  'CinemaCollections',
  'CinemaPlaylists',
  'Movies',
  'TVEpisodes',
] as const

export type MediaServerAspect = typeof MediaServerAspects[number]

/**
 * Master list of all capabilities.
 */
export const MediaServerCapabilities = [
  'CurrentUser.Read',
  'CurrentUser.Update',

  'AdminApp.Login',

  'Users.Create',
  'Users.Read',
  'Users.Update',

  'Invitations.Create',
  'Invitations.Read',
  'Invitations.Update',
  'Invitations.Delete',

  'RoleAssignments.Create',
  'RoleAssignments.Read',
  'RoleAssignments.Delete',

  'Indexing.Read',
  'Indexing.Operate',
  'Indexing.Deindex',

  'Jobs.Create',
  'Jobs.Read',
  'Jobs.Operate',

  'Libraries.Create',
  'Libraries.Read',
  'Libraries.Update',
  'Libraries.Delete',

  'MusicApp.Login',

  'MusicArtists.Read',

  'MusicReleases.Read',

  'MusicGenres.Read',

  'MusicTracks.Read',
  'MusicTracks.Play',

  'MusicHistory.Create',
  'MusicHistory.Read',

  'PhotosApp.Login',

  'Photos.Read',
  'Photos.Update',

  'PhotoFaces.Read',

  'PhotoAlbums.Create',
  'PhotoAlbums.Read',
  'PhotoAlbums.Update',
  'PhotoAlbums.Delete',

  'CinemaApp.Login',

  'TVChannels.Read',

  'CinemaHistory.Read',

  'CinemaCollections.Read',

  'CinemaPlaylists.Read',

  'Movies.Read',

  'TVEpisodes.Read',
] as const

/**
 * Type with only literal capabilities.
 */
export type MediaServerCapability = typeof MediaServerCapabilities[number]

/**
 * Type that joins literal capabilities with wildcards for assignments.
 */
export type MediaServerCapabilityAssignment = CapabilityAssignment<MediaServerCapability>

/**
 * Master list of all roles.
 */
export enum MediaServerRoleName {
  OWNER = 'owner',
  ADMINISTRATIOR = 'administrator',
  MEDIA_APPS_USER = 'media_apps_user',
  MUSIC_USER = 'music_user',
  PHOTOS_USER = 'photos_user',
  CINEMA_USER = 'cinema_user',
  NEWCOMER = 'newcomer',
}

/**
 * Arrays for spreading into the roles master list.
 */
const MINIMALLY_NECESSARY_CAPABILITIES: CapabilityAssignments<MediaServerCapability> = [
  'CurrentUser.Read',
  'CurrentUser.Update',
]
const READONLY_CROSS_APP_FEATURES: CapabilityAssignments<MediaServerCapability> = [
  'Libraries.Read',
  'Indexing.Read',
  'Jobs.Read',
]
const ALL_MUSIC_APP_CAPABILITIES: CapabilityAssignments<MediaServerCapability> = [
  'MusicApp.*',
  'MusicArtists.*',
  'MusicReleases.*',
  'MusicGenres.*',
  'MusicTracks.*',
  'MusicHistory.*',
]
const ALL_PHOTOS_APP_CAPABILITIES: CapabilityAssignments<MediaServerCapability> = [
  'PhotosApp.*',
  'Photos.*',
  'PhotoFaces.*',
  'PhotoAlbums.*',
  'PhotoAlbums.*',
]
const ALL_CINEMA_APP_CAPABILITIES: CapabilityAssignments<MediaServerCapability> = [
  'CinemaApp.*',
  'TVChannels.*',
  'CinemaHistory.*',
  'CinemaCollections.*',
  'CinemaPlaylists.*',
  'Movies.*',
  'TVEpisodes.*',
]

/**
 * Master list of all roles and their capabilities.
 */
export const MediaServerRoles: Record<`${MediaServerRoleName}`, Role<MediaServerCapabilityAssignment>> = {
  [MediaServerRoleName.OWNER]: {
    assignable: false,
    revocable: false,
    maxUsers: 1,
    name: MediaServerRoleName.OWNER,
    capabilities: [
      '*.*',
    ],
  },
  [MediaServerRoleName.ADMINISTRATIOR]: {
    assignable: true,
    revocable: true,
    maxUsers: null,
    name: MediaServerRoleName.ADMINISTRATIOR,
    capabilities: [
      '*.*',
    ],
  },
  [MediaServerRoleName.MEDIA_APPS_USER]: {
    assignable: true,
    revocable: true,
    maxUsers: null,
    name: MediaServerRoleName.MEDIA_APPS_USER,
    capabilities: [
      ...MINIMALLY_NECESSARY_CAPABILITIES,
      ...READONLY_CROSS_APP_FEATURES,
      ...ALL_MUSIC_APP_CAPABILITIES,
      ...ALL_PHOTOS_APP_CAPABILITIES,
      ...ALL_CINEMA_APP_CAPABILITIES,
    ],
  },
  [MediaServerRoleName.MUSIC_USER]: {
    assignable: true,
    revocable: true,
    maxUsers: null,
    name: MediaServerRoleName.MUSIC_USER,
    capabilities: [
      ...MINIMALLY_NECESSARY_CAPABILITIES,
      ...READONLY_CROSS_APP_FEATURES,
      ...ALL_MUSIC_APP_CAPABILITIES,
    ],
  },
  [MediaServerRoleName.PHOTOS_USER]: {
    assignable: true,
    revocable: true,
    maxUsers: null,
    name: MediaServerRoleName.PHOTOS_USER,
    capabilities: [
      ...MINIMALLY_NECESSARY_CAPABILITIES,
      ...READONLY_CROSS_APP_FEATURES,
      ...ALL_PHOTOS_APP_CAPABILITIES,
    ],
  },
  [MediaServerRoleName.CINEMA_USER]: {
    assignable: true,
    revocable: true,
    maxUsers: null,
    name: MediaServerRoleName.CINEMA_USER,
    capabilities: [
      ...MINIMALLY_NECESSARY_CAPABILITIES,
      ...READONLY_CROSS_APP_FEATURES,
      ...ALL_CINEMA_APP_CAPABILITIES,
    ],
  },
  [MediaServerRoleName.NEWCOMER]: {
    assignable: true,
    revocable: true,
    maxUsers: null,
    name: MediaServerRoleName.NEWCOMER,
    capabilities: [
      ...MINIMALLY_NECESSARY_CAPABILITIES,
      'MusicApp.Login',
      'PhotosApp.Login',
      'CinemaApp.Login',
      'CurrentUser.Read',
    ],
  },
} as const

/**
 * Type with all literal role names.
 */
export type MediaServerRoleNames = keyof typeof MediaServerRoles

/**
 * Returns a single role.
 */
export const getMediaServerRole = (role: MediaServerRoleNames): Role<MediaServerCapabilityAssignment> => {
  return MediaServerRoles?.[role]
}
