import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface'

import { CorsService } from './cors.service'

/**
 * Builds the app-wide CORS options around the CorsService allowlist. The
 * methods, exposed headers, and credentials flag are part of the existing API
 * contract and must not change.
 */
export function buildCorsOptions(corsService: CorsService): CorsOptions {
  return {
    origin: (origin, callback) => {
      corsService.isOriginAllowed(origin)
        .then((allowed) => callback(null, allowed))
        .catch((error) => callback(error instanceof Error ? error : new Error(String(error)), false))
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    exposedHeaders: [
      'Cardinal-Extra-Message',
      'Cardinal-Toast',
    ],
    credentials: true,
  }
}
