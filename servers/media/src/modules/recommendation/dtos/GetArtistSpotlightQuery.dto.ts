import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, Min } from 'class-validator'

export class GetArtistSpotlightQueryDto {
  /**
   * Which spotlight in the page's sequence this is. Each position is
   * guaranteed a different artist and a different reason than the ones before
   * it; a position with nothing distinct left returns a null spotlight.
   */
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number = 0
}
