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
