import { IsArray, IsIn, IsOptional } from 'class-validator'

import { PlaybackQueueItem } from '../playback-queue-item.entity'

// TODO allow the user to steer the dynamic direction
export class ExtendPlaybackQueueDto {
  @IsIn(['next', 'end'])
  @IsOptional()
  insert?: 'next' | 'end'

  /*
    Explicit items to add ("Play Next" / "Add to Queue"). When omitted on a dynamic
    queue, the queue's own generator produces the next batch instead.
  */
  @IsArray()
  @IsOptional()
  items?: Partial<PlaybackQueueItem>[]
}
