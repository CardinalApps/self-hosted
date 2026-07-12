export const MODE_DEV = 'dev'
export const MODE_PROD = 'prod'

// Every bundler in the monorepo (Vite, Next.js, Metro) statically replaces this expression at
// build time, so it is safe in the browser where no real `process` global exists.
declare const process: { env: { NODE_ENV?: string } }

/*
  Determines the mode. Can be `dev` or `prod`.

  The mode is a build-time property: dev servers produce `dev`, production builds produce `prod`.
  It deliberately ignores where the app is served from, so that users can self-host production
  builds anywhere, including on localhost.
*/
export function getMode() {
  return process.env.NODE_ENV === 'development' ? MODE_DEV : MODE_PROD
}
