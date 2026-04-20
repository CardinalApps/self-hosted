// TODO: Add integration tests for all API endpoints listed below.
// Tests live in tests/integration/<module>/<file>.integration.ts
//
// General (tests/integration/app/general.integration.ts)
//   [x] GET  /api                                  - Get information about your API
//   [x] GET  /api/v1/health                        - Know if your Media Server is online
//   [x] GET  /api/v1/instance                      - Get information about this server instance
//   [x] GET  /api/v1/versions                      - Get versions of things
//   [x] GET  /api/v1/release-channels              - Get the current release channel
//   [x] GET  /api/v1/updates                       - Manually check for available updates
//   [x] GET  /api/v1/events/subscribe              - Subscribe to real time events
//   [x] GET  /api/v1/ls                            - List the contents of a directory
//
// Setup & Reset (tests/integration/app/setup-reset.spec.ts)
//   [x] POST   /api/v1/setup                       - Initial setup
//   [x] POST   /api/v1/reset                       - Reset server state
//
// Auth (tests/integration/auth/login.integration.ts)
//   [x] POST   /api/v1/login                       - Log into a Cardinal app
//
// Users (tests/integration/users/)
//   [x] GET    /api/v1/users                       - Get all users in this server
//   [x] POST   /api/v1/users                       - Create a new local Media Server user
//   [x] GET    /api/v1/users/active                - Get active Media Server users
//   [x] GET    /api/v1/users/current               - Get the currently logged in user
//   [x] PATCH  /api/v1/users/current               - Update your own user
//   [x] GET    /api/v1/users/owner                 - Returns the server owner
//   [x] GET    /api/v1/users/public                - Get a list of users for the login screen
//   [x] GET    /api/v1/users/{id}                  - Get a specific user
//   [x] PATCH  /api/v1/users/{id}                  - Update a user
//
// Roles (tests/integration/roles/)
//   [x] GET    /api/v1/roles/assignments            - Get role assignments
//   [x] POST   /api/v1/roles/{role}/assignments     - Assign roles
//   [x] DELETE /api/v1/roles/{role}/assignments     - Revoke roles
//
// Invitations (tests/integration/invitations/)
//   [x] GET    /api/v1/invitations                  - Query invitations
//   [x] POST   /api/v1/invitations                  - Create a new invitation
//   [x] GET    /api/v1/invitations/{id}             - Get data about an invitation
//   [x] DELETE /api/v1/invitations/{id}             - Delete an invitation
//
// Settings (tests/integration/settings/settings.spec.ts)
//   [x] GET    /api/v1/settings/{app}               - Get app settings
//   [x] PATCH  /api/v1/settings                     - Save app settings
//
// Licensing (tests/integration/licensing/licensing.spec.ts)
//   [x] GET    /api/v1/licensing/seats              - Get information about seat usage
//   [x] GET    /api/v1/licensing/subscription       - Get the subscription tier
//
// Libraries (tests/integration/libraries/libraries.spec.ts)
//   [x] GET    /api/v1/libraries                    - Get the current user's all libraries
//   [x] POST   /api/v1/library                      - Create a new library
//   [x] GET    /api/v1/library/{id}                 - Get a library
//   [x] PATCH  /api/v1/library/{id}                 - Update a library
//   [x] DELETE /api/v1/library/{id}                 - Delete a library
//
// Indexing
//   [ ] GET    /api/v1/index/state                  - Get the current state of the indexing service
//   [ ] PATCH  /api/v1/index/state                  - Control the current indexing run
//   [ ] POST   /api/v1/index/run                    - Start an indexing run
//   [ ] GET    /api/v1/index/runs                   - Get your previous indexing runs
//   [ ] GET    /api/v1/index/counts                 - Count your files
//   [ ] GET    /api/v1/index/directories            - Get your media directories
//   [ ] GET    /api/v1/index/file                   - Get files from your index
//   [ ] DELETE /api/v1/index/files                  - Deindex one or more files
//   [ ] POST   /api/v1/index/seed/fs               - Seed the file system with mock music folders/files
//   [ ] POST   /api/v1/index/seed/large             - Seed the index with millions of mock music files
//
// Jobs (tests/integration/jobs/jobs.spec.ts)
//   [x] GET    /api/v1/jobs                         - Fetch server jobs
//   [x] GET    /api/v1/jobs/types                   - Get all job types
//   [x] POST   /api/v1/job                          - Create a new job
//   [x] GET    /api/v1/job/{id}                     - Get a single job
//   [x] PATCH  /api/v1/job/{id}                     - Control a job
//   [x] GET    /api/v1/job/{id}/tasks               - Get a job's tasks
//
// Music
//   [ ] GET    /api/v1/music/artists                - Query music artists
//   [ ] GET    /api/v1/music/artist/{id}            - Get a single music artist
//   [ ] GET    /api/v1/music/releases               - Query music releases
//   [ ] GET    /api/v1/music/release/{id}           - Get a single music release
//   [ ] GET    /api/v1/music/releases/{id}/cover    - Get the cover image of a release
//   [ ] GET    /api/v1/music/tracks                 - Query music tracks
//   [ ] GET    /api/v1/music/track/{id}             - Get a single music track
//   [ ] GET    /api/v1/music/stream/{id}            - Stream a music track
//   [ ] GET    /api/v1/music/genre/{id}             - Get a single music genre
//   [ ] GET    /api/v1/music/history                - Query playback history
//   [ ] PATCH  /api/v1/music/history                - Save playback history
//
// Playback Queues (tests/integration/playback-queues/playback-queues.spec.ts)
//   [x] GET    /api/v1/playback-queues              - Query queues
//   [x] POST   /api/v1/playback-queues              - Create a new queue
//   [x] GET    /api/v1/playback-queues/{id}         - Get a queue
//   [x] DELETE /api/v1/playback-queues/{id}         - Delete a queue
//   [x] POST   /api/v1/playback-queues/{id}/extend  - Add items to a dynamic queue
//   [x] GET    /api/v1/playback-queues/{id}/items   - Query queue items
//
// Ratings
//   [ ] GET    /api/v1/ratings                      - Query ratings for the current user
//   [ ] PUT    /api/v1/ratings                      - Set a rating for a media item
//   [ ] DELETE /api/v1/ratings/{mediaType}/{mediaId} - Remove a rating for a media item
//
// Photos
//   [ ] GET    /api/v1/photos                       - Get your photos
//   [ ] GET    /api/v1/photos/count                 - Count your photos
//   [ ] GET    /api/v1/photo/{id}                   - Get data about a photo
//   [ ] PATCH  /api/v1/photo/{id}                   - Update a photo
//   [ ] GET    /api/v1/photo/{id}/blob              - Get a photo blob
//   [ ] GET    /api/v1/photo/{id}/thumbnail         - Get a photo thumbnail
//
// Photo Albums
//   [ ] GET    /api/v1/photo-albums                 - Get your photo albums
//   [ ] GET    /api/v1/photo-albums/count           - Count your photo albums
//   [ ] POST   /api/v1/photo-album                  - Create a new photo album
//   [ ] GET    /api/v1/photo-album/{id}             - Get a single photo album
//   [ ] PATCH  /api/v1/photo-album/{id}             - Update a photo album
//   [ ] DELETE /api/v1/photo-album/{id}             - Delete a photo album
//   [ ] GET    /api/v1/photo-album/{id}/entries     - Get photo album entries
//
// Thumbnails
//   [ ] DELETE /api/v1/thumbnails                   - Delete all cached thumbnail files
