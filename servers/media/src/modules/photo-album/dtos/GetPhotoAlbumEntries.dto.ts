import { Transform } from 'class-transformer'
import { IsBoolean, IsString, IsOptional, IsNumber, IsIn } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'

import { toNumber } from '../../../utils/transformers'

enum AllowedPhotosOrderBy {
  'createdAt' = 'createdAt',
  'modifiedAt' = 'modifiedAt',
}

class PhotoAlbumEntriesPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedPhotosOrderBy))
  orderBy?: AllowedPhotosOrderBy = AllowedPhotosOrderBy.createdAt
}

export class GetPhotoAlbumEntriesDto extends PhotoAlbumEntriesPagination {
  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  joinPhoto?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  joinPhotoAlbum?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  featured?: boolean
}

export class GetPhotoAlbumEntriesParamsDto {
  @Transform(toNumber)
  @IsNumber()
  id: number
}
