import { Module } from '@nestjs/common'

import { TranscodingService } from './transcoding.service'

@Module({
  exports: [TranscodingService],
  providers: [TranscodingService],
})
export class TranscodingModule {}
