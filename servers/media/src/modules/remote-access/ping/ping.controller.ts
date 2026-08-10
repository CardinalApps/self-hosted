import { Controller, Get, Post, Req, Res, VERSION_NEUTRAL, Version } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'
import { ECHO_MAX_BYTES } from '@cardinalapps/remote-access/dist/cjs'

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

  /**
   * Echoes the raw request body back for the Remote Access Server's
   * end-to-end diagnostics. Same probe signature contract as /ping; the body
   * is read manually because it is a raw octet stream, not JSON.
   */
  @Post('/ping/echo')
  @Version([VERSION_NEUTRAL])
  @ApiExcludeEndpoint()
  echo(@Req() request, @Res() response): void {
    if (request.isValidProbe !== true) {
      response.status(404).json({})
      return
    }

    const chunks: Buffer[] = []
    let totalBytes = 0

    request.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length

      if (totalBytes > ECHO_MAX_BYTES) {
        if (!response.headersSent) {
          response.status(413).json({})
        }
        request.destroy()
        return
      }

      chunks.push(chunk)
    })

    request.on('end', () => {
      if (response.headersSent) {
        return
      }

      response.setHeader('Content-Type', 'application/octet-stream')
      response.setHeader('X-Cardinal-Probe-Pong', '1')
      response.status(200).send(Buffer.concat(chunks))
    })
  }
}
