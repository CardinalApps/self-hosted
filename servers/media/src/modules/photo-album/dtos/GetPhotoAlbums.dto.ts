import { Transform } from 'class-transformer'
import { IsBoolean, IsString, IsOptional, IsIn } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'

enum AllowedPhotosOrderBy {
  'createdAt' = 'createdAt',
  'modifiedAt' = 'modifiedAt',
}

class PhotoAlbumsPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedPhotosOrderBy))
  orderBy?: AllowedPhotosOrderBy = AllowedPhotosOrderBy.createdAt
}

export class GetPhotoAlbumsDto extends PhotoAlbumsPagination {
  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  metadata?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  thumbnails?: boolean = false
}
