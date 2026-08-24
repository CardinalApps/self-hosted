import { Body, Controller, Get, Put } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { PortMapperService } from './port-mapper.service'
import { PortMapperStatus } from './port-mapper.types'
import { PortMapperStatusResponse } from './dtos/PortMapperStatusResponse.dto'
import { UpdatePortMapperSettingsDto } from './dtos/UpdatePortMapperSettings.dto'
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
    return toStatusResponse(this.portMapperService.getStatus())
  }

  /**
   * Turns automatic port forwarding on or off and reports the resulting state.
   */
  @Put('/settings')
  @StandardEndpoint({
    summary: 'Update the UPnP port mapping setting.',
    description: 'Enables or disables automatic port forwarding. Enabling maps the port immediately when the Remote Access listener is already running.',
    capabilities: ['ServerSettings.Update'],
  })
  @ApiOkResponse({ type: PortMapperStatusResponse })
  async updateSettings(@Body() { enabled }: UpdatePortMapperSettingsDto): Promise<PortMapperStatusResponse> {
    return toStatusResponse(await this.portMapperService.setEnabled(enabled))
  }
}

// Flattens the internal status union into the wire shape, with dates as ISO strings
function toStatusResponse(status: PortMapperStatus): PortMapperStatusResponse {
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
