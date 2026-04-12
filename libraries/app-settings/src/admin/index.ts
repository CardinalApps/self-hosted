import { SERVER_NAME_SLUG, serverNameFactory } from './server_name'
import { MAX_RATING_SLUG, maxRatingFactory } from './max_rating'

export const adminFields = {
  [SERVER_NAME_SLUG]: serverNameFactory,
  [MAX_RATING_SLUG]: maxRatingFactory,
}
