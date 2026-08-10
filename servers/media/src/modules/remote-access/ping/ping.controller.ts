import { Controller, Get, Req, Res, VERSION_NEUTRAL, Version } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'

@Controller()
export class PingController {
  /**
   * Answers the Remote Access Server's signed reachability probes. Kept out of
   * the public OpenAPI schema; anything but a validly signed probe gets a 404.
   */
  @Get('/ping')
  @Version([VERSION_NEUTRAL])
  @ApiExcludeEndpoint()
  ping(@Req() request, @Res() response): void {
    if (request.isValidProbe === true) {
      response.setHeader('X-Cardinal-Probe-Pong', '1')
      response.status(200).json({ ok: true, ts: Date.now() })
    } else {
      response.status(404).json({})
    }
  }
}
