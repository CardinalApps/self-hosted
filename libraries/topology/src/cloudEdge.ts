export enum TopologicalEnv {
  DEV = "dev",
  PROD = 'prod',
}

export type Endpoint = `/${string}`

// Unfortunately the apps use a mix of shorthand and long form names
// (dev/development). This type allows for any of them.
export type MixedAppEnv = 'dev' | 'development' | 'prod' | 'production'

export type HTTPMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export enum InfrastructureProvider {
  AZURE = "Microsoft Azure",
  AWS = "Amazon Web Services",
  GCP = "Google Cloud Platform",
}

export enum CloudService {
  AUTH = "auth",
  BEV = "bev",
  CMS = "cms",
  HELP = "help",
  STATUS = "status",
  WEBSITE = "website",
}

export type CloudApp = {
  provider: InfrastructureProvider,
  service: CloudService,
  entry: Record<TopologicalEnv, string>,
}

export const CloudEdge = {
  auth: {
    provider: InfrastructureProvider.AZURE,
    name: 'Authentication',
    entry: {
      dev: 'http://localhost:4013',
      prod: 'https://auth.cardinalcloud.io',
    },
  },
} as const

/**
 * Returns the URL of a Cardinal Cloud service.
 */
export const getCloudServiceURL = (
  mixedEnv: MixedAppEnv,
  service: CloudService,
) => {
  let resolvedEnv
  if (mixedEnv === 'dev' || mixedEnv === 'development') {
    resolvedEnv = TopologicalEnv.DEV
  } else if (mixedEnv === 'prod' || mixedEnv === 'production') {
    resolvedEnv = TopologicalEnv.PROD
  }
  // @ts-ignore
  return CloudEdge[service].entry[resolvedEnv]
}
