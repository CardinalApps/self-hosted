import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { PortMapperService } from './port-mapper.service'
import { PortMapperStatusResponse } from './dtos/PortMapperStatusResponse.dto'
import { StandardEndpoint } from '../../../decorators/StandardEndpoint.decorator'

@Controller('/port-mapper')
@ApiTags('Remote Access')
export class PortMapperController {
  constructor(
    private readonly portMapperService: PortMapperService,
  ) {}

  /**
   * Returns the live port mapping state for the Admin UI.
   */
  @Get('/status')
  @StandardEndpoint({
    summary: 'Get the UPnP port mapping status.',
    capabilities: ['ServerSettings.Read'],
  })
  @ApiOkResponse({ type: PortMapperStatusResponse })
  getStatus(): PortMapperStatusResponse {
    const status = this.portMapperService.getStatus()

    switch (status.state) {
      case 'active':
        return {
          state: status.state,
          externalIp: status.externalIp,
          externalPort: status.externalPort,
          internalPort: status.internalPort,
          leaseExpiresAt: status.leaseExpiresAt.toISOString(),
        }
      case 'failed':
        return {
          state: status.state,
          reason: status.reason,
          lastAttemptAt: status.lastAttemptAt.toISOString(),
        }
      default:
        return { state: status.state }
    }
  }
}
