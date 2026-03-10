import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, IsIn } from 'class-validator'

/**
 * Base fields for pagination.
 * 
 * Inheritors of this class should implement the `orderBy` field with the
 * appropriate fields for their entity.
 */
export class Pagination {
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsNumber()
  take?: number = 12

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsNumber()
  skip?: number = 0

  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC'
}
