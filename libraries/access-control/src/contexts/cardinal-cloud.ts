import { CapabilityAssignment } from "../capabilities"
import { Role } from "../roles"

/**
 * Master list of all aspects.
 */
export const CloudAspects = [
  'CurrentUser',
] as const

export type CloudAspect = typeof CloudAspects[number]

/**
 * Master list of all capabilities.
 */
export const CloudCapabilities = [
  'CurrentUser.Read',
  'CurrentUser.Update',
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
    name: CloudRoleName.ADMINISTRATIOR,
    capabilities: [
      'CurrentUser.Read',
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
