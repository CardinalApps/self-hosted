# Summary

This is a repository for media streaming software. It is a pnpm monorepo with a workspace that includes many frontend packages and backend packages.

The frontend exists in `/apps`, it's made with React and Redux, and it imports code from `/libraries`. The backend lives in `/servers`, it's made with Node.js (using Nest.js or Express.js) and also imports code from `/libraries`. Code sharing is enouraged (but not excessively) since everything is written in TypeScript.

# Commits

Keep your commit messages short and to the point. Your commits should be just 1 or 2 sentences.

# Application Authentication Layer

Cardinal's authentication layer is subject to extra complexity because end-users self-host Cardinal's applications themselves. Users can self-host applications in various locations, like on the internet (where you would expect HTTPS traffic) or their own home hardware (where you would expect HTTP traffic, and potentially no internet access at all).

To support this architecture, Cardinal offers two identity providers. The code for both of these identity providers is in this monorepo, so it's important to not mix up the two when working with code that related to users and authentication. For example, when you see a `userId` variable, you must make the effort to figure out the context of that `userId` - is it provided by the cloud or local IDP? You must know that before you can work on the issue.

Here is a quick summary of the two IDPs:

1. **The cloud IDP**: This identity provider is a free public service that is run by Cardinal Apps Inc. The backend for this IDP is hosted at https://auth.cardinalcloud.io. The source code for this IDP is at @servers/auth.
2. **The local IDP**: This identity provider is implemented directly into Cardinal Media Server, and it is self-hosted by the user. It allows for the user to create and manage users that are scoped solely to their own local Cardinal Media Server instance. The user controls where it is hosted, so it is not possible to know unless you check at runtime. The source code for this IDP is spread into the modules of @servers/media.

## Key things to know about working with the authentication layer

- The specification for the authentication server is available at @servers/auth/docs/openapi/latest/openapi.yaml. This includes endpoints for working with the cloud IDP. This package uses a spec-driven approach, so you must first write your updates to the OpenAPI file and then add the code features after confirming the spec updates with the developer.
- The specification for Cardinal Media Server's API is available at @servers/media/openapi.json. This includes endpoints for the local IDP. This package generates the OpenAPI spec automatically using the code, so you do not need to write an update to the spec manually first.
- Sometimes the user will be logged into both IDPs, sometimes just one, or sometimes none.
- Some endpoints in the local IDP require a valid token from the cloud IDP, but only if the feature requires a cloud subscription. There is documentation in the Media Server's OpenAPI specification on how to use both tokens at the same time with the local IDP.
- Both IDPs use JWTs.
- The cloud IDP may be unavailable at any time.
- The local IDP offers a special account called the Guest Account. It does not require a username or password, but it may be disabled by the server owner at any time.
- Users can log into their local IDP using the cloud IDP by linking their local account to their cloud account. This one-to-one link is constructed by saving the cloud user ID in the local user entity, under the `cardinalId` property. A copy of the cloud user object is also cached locally in the local IDP's database. Any local user that has a non-null `cardinalId` will require the special second authorization header to be included with all network requests, as per the OpenAPI specification.

# Database Layer

- When working on Cardinal Media Server, you must support both SQLite and PostreSQL. Historically, to support both databases, the application layer has been limited  to using only the simpler set of features that SQLite supports, since we can trust that PostgreSQL will support those features too. This "lowest common denominator" approach is convenient and keep complexity low, but it means not using JSONB or any of PostgreSQL's advanced features. That is why you will find stringified arrays and objects in the database in some places. However, at this point you are encouraged to suggest ways to improve this situation for existing code, and for future code you should find ways to take advantage of PostgreSQL's advanced features. This typically means writing two functions: one for SQLite and one for PostgreSQL, but you should always consider the option, and you should suggest it if you deem it worth the extra maintenance burden of two functions.
- All of the other applications in the monorepo support just one type of database (either PostgreSQL or MongoDB). You will have to check each package's dependencies to confirm.

# Documentation

Many of the features offered by Cardinal Media Server are documented in the @apps/help-web app. You should be familiar with the topics that are covered on the help site, and you should be aware of when you make changes elsewhere in the repository that will require updating the help site. A common example is with environment vaiables in the Media Server; if you add or update one, it must be documented in the help app.
