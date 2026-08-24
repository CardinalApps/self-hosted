import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional } from 'class-validator'

export class GetPhotoBlobDto {
  /**
   * When auto convert is enabled, the server will return the best image format
   * for the client.
   * 
   * Cases:
   * 
   * 1. HEIC/HEIF images will be converted to JPEG for clients that are not
   *    macOS and not Windows 11.
   */
  // A repeated query param arrives as an array rather than a string, so the
  // value cannot be assumed to answer to toLowerCase().
  @Transform(({ value }) => value === undefined ? true : String(value).toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  autoConvert?: boolean = true
}
