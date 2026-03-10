import { applyDecorators, UseGuards } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOperation,
  ApiSecurity,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { MediaServerCapability } from '@cardinalapps/access-control/dist/cjs'
import { Capabilities } from './Capabilities.decorator'
import { CapabilitiesGuard } from '../guards/capabilities.guard'
import { AuthGuard } from '../guards/auth.guard'
import { ApiSecurityTypes } from '../guards/types'

const ICON = '🛡️'

export type StandardEndpointOptionsType = {
  auth?: boolean,
  summary?: string,
  description?: string,
  capabilities?: MediaServerCapability[],
  manualCapabilities?: MediaServerCapability[],
  manualCapabilitiesAreAllRequired?: boolean,
  cloudUserHeader?: boolean,
  errors?: {
    400?: string[],
    401?: string[],
    403?: string[],
  },
}

/**
 * The StandardEndpoint decorator automatically combines and applies all of the
 * required decorators for securing the API endpoint with authentication and
 * RBAC, and adds other options for avoiding decorator hell in controllers.
 * 
 * This decorator will also automatically apply OpenAPI decorators for
 * documenting the endpoint.
 * 
 * @param [options.auth] - Enable local auth on this endpoint. Enabled by default.
 * @param [options.capabilities] - Automatically enable RBAC capability
 * validation for this endpoint. If more than one capability is given, all will
 * be required. Undefined (off) by default. These will be documented publicly in
 * the OpenAPI docs.
 * @param [options.manualCapabilities] - If this endpoint would prefer not to
 * use the automatic `capabilities` option, and instead handle capability
 * validation downstream of this decorator, then leave the regular
 * `capabilities` array undefined and set the capabilities in this one for
 * documentation purposes only.
 * @param [options.manualCapabilitiesAreAllRequired] - Sets whether the
 * capabilities set in the `manualCapabilities` array are being validated with
 * logical `AND` or `OR`. This is for documentation purposes only; it is still
 * up to the downstream validation to implement the behaviour that is set here.
 * @param [options.summary] - OpenAPI docs summary text (publicly viewable).
 * @param [options.description] - OpenAPI docs description text (publicly viewable).
 * @param [options.cloudUserHeader] - Enables the Cardinal Account JWT header
 * for receiving the cloud user JWT from a local user. Disabled by default.
 * @param [options.errorReasons] - Provide error messages to concatenate with
 * internal error messages. Use an array of present-tense strings, or provide an
 * empty array to just enable the built-in message for that code.
 */
export function StandardEndpoint(options: StandardEndpointOptionsType) {
  const {
    auth = true,
    capabilities,
    manualCapabilities,
    manualCapabilitiesAreAllRequired = true,
    summary = '',
    description = '',
    cloudUserHeader = false,
    errors,
  } = options

  const publicSummary = (
    (capabilities || manualCapabilities ? ICON + ' ' : '')
    + summary
  )

  const publicDescription = (
     description
     + (description ? '<br /><hr />' : '')
     + `<h3>${ICON} ${capabilities || manualCapabilitiesAreAllRequired ? 'Requires Capabilities: ' : 'Requires one of these Capabilities: '}`
     + (() => {
          if (!capabilities && !manualCapabilities) {
            return 'None'
          }
          const mergedCaps = Array.from(new Set([].concat(capabilities).concat(manualCapabilities)))
          return mergedCaps
            .filter((cap) => !!cap)
            .map((cap) => `<code>${cap}</code>`)
            .join(' ')
       })()
     + '</h3>'
  )

  return applyDecorators(
    // Docs
    ApiOperation({
      summary: publicSummary,
      description: publicDescription,
    }, {
      overrideExisting: false,
    }),

    // Docs for 400
    ...(errors?.[400]
      ? [ApiBadRequestResponse({
          description:
            "Possible reasons: "
            + ['Request validation failed, see response for details']
                .concat(errors?.[400] || [])
                .join('; ') + '.',
        })]
      : []
    ),

    // Authentication guard and docs
    ...(auth ? [UseGuards(AuthGuard)] : []),
    ...(auth ? [ApiSecurity(ApiSecurityTypes.LOCAL_USER_JWT)] : []),
    ...(auth || errors?.[401]
      ? [ApiUnauthorizedResponse({
          description:
            "Possible reasons: "
            + ['The authorization token is invalid']
                .concat(errors?.[401] || [])
                .join('; ') + '.',
        })]
      : []
    ),

    // RBAC guards and docs
    ...(capabilities ? [UseGuards(CapabilitiesGuard)] : []),
    ...(capabilities ? [Capabilities(capabilities)] : []),
    ...(capabilities || errors?.[403]
      ? [ApiForbiddenResponse({
          description:
            "Possible reasons: "
            + (capabilities
                ? ['The user does not have sufficent capabilities']
                : []
              )
                .concat(errors?.[403] || [])
                .join('; ') + '.',
        })]
      : []
    ),

    // Headers
    ...(cloudUserHeader ? [ApiHeader({ name: 'CardinalTolkien' })] : []),
  )
}
