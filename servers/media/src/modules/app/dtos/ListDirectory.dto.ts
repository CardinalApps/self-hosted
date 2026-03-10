import { Transform } from 'class-transformer'
import { IsString, IsBoolean, IsOptional } from 'class-validator'

import { MediaType } from '../../../utils/media'
import { toBoolean } from '../../../utils/transformers'

export class ListDirectoryDto {
  /**
   * The directories whose contents can be listed.
   */
  @IsString()
  rootDir: MediaType

  /**
   * The path of the directory to list within the selected rootDir.
   */
  @Transform(({ value }) => String(value))
  @IsString()
  @IsOptional()
  path?: string

  /**
   * Remove file nodes from the list, leaving only directories.
   */
  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  removeFileNodes?: boolean = false

  /**
   * Adds "empty nodes" to the list to designate empty directories.
   */
  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  addEmptyNodes?: boolean = true
}
