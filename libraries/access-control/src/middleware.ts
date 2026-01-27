import { CapabilityAssignments, hasCapabilities } from "./capabilities"
import { getCloudRole, CloudRoleNames } from "./contexts/cardinal-cloud"

type ExpressRequestDuck = {
  userPreAuthorization: {
    userId: string,
    role: CloudRoleNames,
  },
  user: {
    userId: string,
    role: CloudRoleNames,
  }
}

type ExpressResponseDuck = {
  status: (code: number) => ExpressResponseDuck,
  send: () => void,
}

type ExpressNextFunctionDuck = () => void

/**
 * Express middleware that enforces authentication and RBAC. This expects that
 * the Express app has already set `req.userPreAuthorization` with the
 * authenticated (but not yet authorized) user.
 * 
 * Returns a 401 if `req.userPreAuthorization` is missing, or a 403 if
 * `userPreAuthorization` does not pass RBAC checks.
 * 
 * If checks pass, this copies `req.userPreAuthorization` to `req.user`. If
 * `req.user` has already set upstream, this will throw.
 */
export const createRBACMiddleware = function<Caps>(capabilities: Caps[]) {
  return (req: ExpressRequestDuck, res: ExpressResponseDuck, next: ExpressNextFunctionDuck) => {
    if (
      !req.userPreAuthorization
      || !req?.userPreAuthorization?.userId
      || !req?.userPreAuthorization?.role
    ) {
      return res.status(401).send()
    }

    const userRole = getCloudRole(req.userPreAuthorization.role)

    if (!userRole) {
      return res.status(401).send()
    }

    if (!hasCapabilities<Caps>(capabilities, userRole.capabilities as CapabilityAssignments<Caps>)) {
      return res.status(403).send()
    }

    req.user = { ...req.userPreAuthorization }

    next()
  }
}
