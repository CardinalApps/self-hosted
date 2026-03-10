import { AvatarProps } from "../components/layout/Avatar/Avatar"
import { RoleAssignmentEntity } from "../store/apis/roleAssignments"

export type UserType = {
  activityStatus?: string,
  activityStatusUpdatedAt?: string,
  cachedCloudUser?: {
    userId?: string,
    avatar?: AvatarProps,
    createdAt?: string,
    extraPermissions?: string[],
    revokedPermissions?: string,
    isDeleted?: boolean,
    publicName?: string,
    subscription?: string,
  },
  cachedCloudUserAt?: string,
  cardinalId?: string,
  createdAt?: string,
  deletedAt?: string,
  designation?: "guest_account",
  username?: string,

  enabled?: boolean,
  ssoToken?: string,
  updatedAt?: string,
  userId?: string,
  roles?: RoleAssignmentEntity[],

  /**
   * @deprecated use roles instead
   */
  role?: "user" | "owner",
}
