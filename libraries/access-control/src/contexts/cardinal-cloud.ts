import { CapabilityAssignment } from "../capabilities"
import { Role } from "../roles"

/**
 * Master list of all aspects.
 */
export const CloudAspects = [
  'Users',
  'CurrentUser',
  'CurrentUserSessions',
  'CurrentUserAppAuthorizations',
  'CurrentUserClaims',
  'Email',
  'StoredToken',
  'Subscription',
] as const

export type CloudAspect = typeof CloudAspects[number]

/**
 * Master list of all capabilities.
 */
export const CloudCapabilities = [
  // Intended for Cardinal Apps Inc. employees only
  'Users.Read',

  // Intended for everyone
  'CurrentUser.Read',
  'CurrentUser.Update',
  'CurrentUser.Delete',

  'CurrentUserSessions.Read',
  'CurrentUserSessions.Delete',

  'CurrentUserClaims.Create',
  'CurrentUserClaims.Read',

  'CurrentUserAppAuthorizations.Read',

  'Email.Trigger',

  'StoredToken.Create',
  'StoredToken.Consume',
  'StoredToken.Check',

  'Subscription.Purchase',
  'Subscription.Manage',
] as const

/**
 * Type with only literal capabilities.
 */
export type CloudCapability = typeof CloudCapabilities[number]

/**
 * Type that joins literal capabilities with wildcards for assignments.
 */
export type CloudCapabilityAssignment = CapabilityAssignment<CloudCapability>

/**
 * Master list of all roles and their capabilities.
 */
export enum CloudRoleName {
  ADMINISTRATIOR = 'admin', // For legacy reasons, this does not match the media-server "administrator" slug
  USER = 'user',
}

/**
 * Master list of all roles and their capabilities.
 */
export const CloudRoles: Record<`${CloudRoleName}`, Role<CloudCapabilityAssignment>> = {
  [CloudRoleName.ADMINISTRATIOR]: {
    assignable: true,
    revocable: true,
    maxUsers: null,
    name: CloudRoleName.ADMINISTRATIOR,
    capabilities: [
      '*.*',
    ],
  },
  [CloudRoleName.USER]: {
    assignable: true,
    revocable: true,
    maxUsers: null,
    name: CloudRoleName.USER,
    capabilities: [
      'CurrentUser.*',
      'CurrentUserSessions.*',
      'CurrentUserClaims.*',
      'CurrentUserAppAuthorizations.*',
      'Email.*',
      'StoredToken.*',
      'Subscription.*',
    ],
  },
} as const

/**
 * Type with all literal role names.
 */
export type CloudRoleNames = keyof typeof CloudRoles

/**
 * Returns a single role.
 */
export const getCloudRole = (role: CloudRoleNames): Role<CloudCapabilityAssignment> => {
  return CloudRoles?.[role]
}
