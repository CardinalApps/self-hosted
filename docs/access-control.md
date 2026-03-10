# Access Control

Cardinal's apps implement an access control layer using a Role-Based Access Control
strategy. This document outlines the key concepts that developers must know when
implementing new features that are subject to access control.

Before beginning, read the public docs on how RBAC works as a product feature:

https://help.cardinalapps.io/guides/cardinal-media-server/role-based-access-control

## Contexts

Contexts can be thought of as namespaces for RBAC. Cardinal has two contexts:
*Media Server* and *Cloud*. RBAC is implemented identially in both contexts,
using the same functions and patterns as described below, but the actual
Capabilities and Roles differ between the contexts.

This is necessary because these two contexts have **different user accounts**
managed by different systems. Both contexts may have a role called `Admin`, but
within the Media Server context the `Admin` role grants you access to Media
Server systems, but within the Cloud context the `Admin` role grants
access to Cloud systems.

There is no overlap between contexts. When performing capability checks, the
context must always be passed as a generic for typechecking to work correctly.

## The Core Access Control Library

1. The core library is `@cardinalapps/access-control` and it can be found at
`/libraries/access-control`. It defines types for all of the foundational
concepts like Roles and Capabilities, and exports pure functions for running
access control logic.
1. It also contains the read-only master lists of all Roles, Aspects, and
Capabilities for each Context, and even exports i18n for app UIs. All Cardinal
apps must use this data so that the publicly viewable role descriptions are
always in sync across all of the different places a user can read it (Help site,
in-app, on website).

## Implementing Client-side Access Control

1. When checking capabilities in the UI, use the `<HasCapabilities />` component
or the `useHasCapabilities()` hook for conditional rendering.
1. Some common components like `<AppPage />` have a `capabilities` prop built in
for convenience, while other components exist solely to wrap other components in
capability checks, like `<CardWithCapabilities />`.
1. Some server-side endpoints additionally need to know the Cardinal app context
(Music app, Admin app, etc). This is done with a header called `cardinal-app`,
and it's handled automatically by the RTK base API. Non-RTK-API calls may need
to add the header.

- **Important (1):** If doing custom access checks (without the hasCapabilities
  component or hook), never do *initial* access control checks in hooks or
  useEffects, and don't store the results in state. Doing so will lead to extra
  renders and undesirable flashes of content. With `<HasCapabilities />` and
  `useHasCapabilities()` you will execute exactly 1 RBAC check **before** initial
  component mount. The result is memoized, so it's truly only 1 check until the
  component is unmounted or a memoization dependency changes (unlikely). All
  custom checks should behave the same way and not produce extra renders.
- **Important (2):** When adding capability checks to the UI library, remember
  that components will crash if used in an app *without* a user context and a
  Media Server connection. So, don't do any access control checks in components
  that are shred with the website, account portal, etc (wrap them instead).

## Implementing Server-side Access Control

Servers should only implements Role *Assignments*, not Roles and Capabilities
themselves. Role Assignments are stored in the database, and each one contains a
single role assigned to one user.

Access checks are designed to happen in controllers, but can also be performed
in any service.

### Media Server

#### Performing Checks in Controllers

There exists a decorator called `@Capabilities()` and a guard called
`CapabilitiesGuard`, but using them directly is not the right way to do it. Instead,
use the `@StandardEndpoint()` decorator with the `capabilities` option. This
will automatically apply all of the correct decorators to secure the endpoint, perform
capability checks, and also apply OpenAPI decorators to document the capabilties
and response types for the endpoint.

If your access check has to happen downstream of the decorators, then use the
`manualDecorators` on the option on the `@StandardEndpoint()` and implement the
check in the controller manually. All failed access control checks should return
a 403.

#### Performing Checks In Services

If the access check has to happen in a service, then the service should import
the `hasCapability()` and/or `hasCapabilities()` functions from the
`@cardinalapps/access-control` library. An array containing all of the user's
capabilities will need to be created using their Role Assignments. Use
`getRole()` to get a role's capabilities..
