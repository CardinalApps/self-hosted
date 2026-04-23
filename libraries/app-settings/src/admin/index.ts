import { SERVER_NAME_SLUG, serverNameFactory } from './server_name'
import { MAX_RATING_SLUG, maxRatingFactory } from './max_rating'
import { ENABLE_HALF_RATINGS_SLUG, enableHalfRatingsFactory } from './enable_half_ratings'
import { INACTIVE_SESSION_TIMEOUT_SLUG, inactiveSessionTimeoutFactory } from './inactive_session_timeout'

export const adminFields = {
  [SERVER_NAME_SLUG]: serverNameFactory,
  [MAX_RATING_SLUG]: maxRatingFactory,
  [ENABLE_HALF_RATINGS_SLUG]: enableHalfRatingsFactory,
  [INACTIVE_SESSION_TIMEOUT_SLUG]: inactiveSessionTimeoutFactory,
}
