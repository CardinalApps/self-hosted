import { Transform } from 'class-transformer'
import { IsString } from 'class-validator'

import { toString } from '../../../utils/transformers'

export class MovePlaybackQueueItemParamsDto {
  @Transform(toString)
  @IsString()
  id: string

  @Transform(toString)
  @IsString()
  queueItemId: string
}

export class MovePlaybackQueueItemDto {
  /*
    The item that the moved item was dropped behind. The server resolves the item that
    currently follows it and lands the moved item between the two, so a client working
    from a stale view of the queue cannot compute a position that no longer makes sense.
  */
  @Transform(toString)
  @IsString()
  afterQueueItemId: string
}
