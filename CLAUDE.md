# Summary

This is a repository for media streaming software. It is a pnpm monorepo with a workspace that includes many frontend packages and backend packages.

The frontend exists in `/apps`, it's made with React and Redux, and it imports code from `/libraries`. The backend lives in `/servers`, it's made with Node.js (using Nest.js or Express.js) and also imports code from `/libraries`. Code sharing is enouraged (but not excessively) since everything is written in TypeScript.

# Commits

Keep your commit messages short and to the point.

# Application Authentication Layer

Cardinal's authentication layer is subject to extra complexity because end-users self-host Cardinal's applications themselves. Users can self-host applications in various locations, like the internet (where you would expect HTTPS traffic) to their own home hardware (where you would expect HTTP traffic, and potentially no internet access at all).

To support this architecture, Cardinal offers two identity providers:

1. "The cloud IDP": This identity provider is a service that is run by Cardinal Apps Inc. and it is publicly available for free. The backend for this IDP is available at https://auth.cardinalcloud.io.
2. "The local IDP": This identity provider is implemented in Cardinal Media Server, and it is self-hosted by the user. It allows for the user to create and manage users that are scoped solely to their own local Cardinal Media Server instance.

## Key things to know about working with the authentication layer

- The specification for the authentication server is available at @servers/auth/docs/openapi/latest/openapi.yaml.yaml. This includes endpoints for working with the cloud IDP. Always double check with me if you are even a little unsure of how to use this API.
- The specification for Cardinal Media Server's API is available at @servers/media/openapi.json. This includes the local IDP. Always double check with me if you are even a little unsure of how to use this API.
- Sometimes the user will be logged into both IDPs, sometimes just one, or sometimes none.
- Some endpoints in the local IDP require a valid token from the cloud IDP, but only if the feature requires a cloud subscription. There is documentation in the OpenAPI specification on how to use both tokens at the same time with the local IDP.
- Both IDPs use JWTs.
- The cloud IDP may be unavailable at any time.
- The local IDP offers a special account called the Guest Account. It does not require a username or password, but it may be disabled by the server owner.
- Users can log into their local IDP using the cloud IDP by linking their cloud account to their local account. This one-to-one link is constructed by saving the cloud user ID in the local user entity, under the "cardinalId" property. A copy of the cloud user is also cached locally. Any local user that has a non-null `cardinalId` will require the special second authorization header to be included with all network requests, as per the OpenAPI specification.

# Database Layer

- When working on Cardinal Media Server, you must support both SQLite and PostreSQL. Historically, to support both databases, the application layer has simply gone with the SQLite way of doing things, since PostgreSQL will support it. However that means not using JSONB or any of PostgreSQL's advanced features. That is why you will fine stringified arrays and objects in the database in some places. You are encouraged to suggest ways to fix and improve this for existing code and for future code. This typically means writing two functions: one for SQLite and one for PostgreSQL, but you can suggest it if you deem it worth the extra maintenance burden of two functions.
- All other applications support just one type of database (either PostgreSQL or MongoDB). Check the package's dependencies to confirm.

# Documentation

Many of the features offered by Cardinal Media Server are documented in the @apps/help-web app. You should be familiar with the topics that are covered on the help site, and you should be aware when changes you make elsewhere require updating the help site. A common example is with environment vaiables in the Media Server, if you add or update one, it must be documented in the help app.
