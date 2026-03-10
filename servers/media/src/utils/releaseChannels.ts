export enum ReleaseChannels {
  // Released to the public, and supported by the "check for updates" mechanism.
  // Gets set in the dockerfiles.
  STABLE = 'stable',
  BETA = 'beta',

  // Not currently released to the public, not supported by the "check for
  // updates" mechanism. Get set by the script that is starting the app.
  DEVELOPMENT = 'development',
}
