import { IsOptional, IsString } from 'class-validator'
import { QueueType } from '../queue.entity'

export class CreateQueueDto {
  @IsString()
  type: QueueType

  @IsString()
  @IsOptional()
  dynamicName?: string
}
