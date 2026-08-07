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
  ACCOUNT = "account",
  AUTH = "auth",
  BEV = "bev",
  CMS = "cms",
  FEEDBACK = "feedback",
  HELP = "help",
  POPULARITY = "popularity",
  STATUS = "status",
  WEBSITE = "website",
}

export type CloudApp = {
  provider: InfrastructureProvider,
  service: CloudService,
  entry: Record<TopologicalEnv, string>,
}

export const CloudEdge = {
  account: {
    provider: InfrastructureProvider.AZURE,
    name: 'Account Portal',
    entry: {
      dev: 'http://localhost:3077',
      prod: 'https://account.cardinalapps.io',
    },
  },
  auth: {
    provider: InfrastructureProvider.AZURE,
    name: 'Authentication',
    entry: {
      dev: 'http://localhost:4013',
      prod: 'https://auth.cardinalcloud.io',
    },
  },
  feedback: {
    provider: InfrastructureProvider.AZURE,
    name: 'Feedback',
    entry: {
      dev: 'http://localhost:4024',
      prod: 'https://feedback.cardinalcloud.io',
    },
  },
  popularity: {
    provider: InfrastructureProvider.AZURE,
    name: 'Popularity Data Pool',
    entry: {
      dev: 'http://localhost:4042',
      prod: 'https://popularity.cardinalcloud.io',
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
