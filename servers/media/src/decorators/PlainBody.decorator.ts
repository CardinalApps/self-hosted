import * as rawBody from "raw-body"
import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common'

const PlainBody = createParamDecorator(async (_, context: ExecutionContext) => {
  const req = context.switchToHttp().getRequest<import("express").Request>()
  if (!req.readable) { throw new BadRequestException("Invalid plain body") }

  const body = (await rawBody(req)).toString("utf8").trim()

  return body
})

export default PlainBody
