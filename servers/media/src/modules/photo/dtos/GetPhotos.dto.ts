import { Transform } from 'class-transformer'
import { IsBoolean, IsString, IsOptional, IsIn } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'

enum AllowedPhotosOrderBy {
  'createdAt' = 'createdAt',
  'takenAt' = 'takenAt',
  'modifiedAt' = 'modifiedAt', // Not to be confused with updatedAt
  'width' = 'width',
  'height' = 'height',
  'deviceMake' = 'deviceMake',
  'deviceModel' = 'deviceModel',
  'gpsLat' = 'gpsLat',
  'gpsLng' = 'gpsLng',
  'gpsAltitude' = 'gpsAltitude',
}

class PhotosPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedPhotosOrderBy))
  orderBy?: AllowedPhotosOrderBy = AllowedPhotosOrderBy.takenAt

  /**
   * A photo library reads newest-first, so the direction is defaulted here.
   * The shared Pagination class deliberately leaves it open: defaulting it
   * there would flip every other endpoint, including the ones ordered by name.
   */
  @Transform(({ value }) => String(value).toUpperCase())
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC'
}

export class GetPhotosDto extends PhotosPagination {
  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  metadata?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  thumbnails?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  photoAlbumEntries?: boolean = false
}
