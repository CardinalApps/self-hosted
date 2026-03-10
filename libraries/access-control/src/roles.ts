import { CapabilityAssignments } from "./capabilities"

/**
 * Roles are sets of capability assignments. Users can be assigned multiple
 * different roles to form a superset of capabilities.
 */
export type Role<Caps> = {
  assignable: boolean,
  revocable: boolean,
  maxUsers: number | null, // Use null for unlimited
  name: string,
  capabilities: CapabilityAssignments<Caps>,
}
