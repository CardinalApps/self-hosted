import { IsString } from 'class-validator'
import { ResetType, ResetValidationPhrase } from '../enums'

export class ServerResetDto {
  @IsString()
  type: ResetType

  /**
   * A string of text must be entered to prevent accidentially triggering this endpoint.
   */
  @IsString()
  validationString: ResetValidationPhrase
}
