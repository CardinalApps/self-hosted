import { SERVER_NAME_SLUG, serverNameFactory } from './server_name'
import { MAX_RATING_SLUG, maxRatingFactory } from './max_rating'
import { ENABLE_HALF_RATINGS_SLUG, enableHalfRatingsFactory } from './enable_half_ratings'
import { ENABLE_POPULARITY_DATA_POOL_SLUG, enablePopularityDataPoolFactory } from './enable_popularity_data_pool'
import { INACTIVE_SESSION_TIMEOUT_SLUG, inactiveSessionTimeoutFactory } from './inactive_session_timeout'
import { ENABLE_REMOTE_ACCESS_SLUG, enableRemoteAccessFactory } from './enable_remote_access'
import { ENABLE_REMOTE_ACCESS_DIRECT_SLUG, enableRemoteAccessDirectFactory } from './enable_remote_access_direct'
import { ENABLE_REMOTE_ACCESS_RELAY_SLUG, enableRemoteAccessRelayFactory } from './enable_remote_access_relay'
import { ENABLE_REMOTE_ACCESS_UPNP_SLUG, enableRemoteAccessUpnpFactory } from './enable_remote_access_upnp'

export const adminFields = {
  [SERVER_NAME_SLUG]: serverNameFactory,
  [MAX_RATING_SLUG]: maxRatingFactory,
  [ENABLE_HALF_RATINGS_SLUG]: enableHalfRatingsFactory,
  [ENABLE_POPULARITY_DATA_POOL_SLUG]: enablePopularityDataPoolFactory,
  [INACTIVE_SESSION_TIMEOUT_SLUG]: inactiveSessionTimeoutFactory,
  [ENABLE_REMOTE_ACCESS_SLUG]: enableRemoteAccessFactory,
  [ENABLE_REMOTE_ACCESS_DIRECT_SLUG]: enableRemoteAccessDirectFactory,
  [ENABLE_REMOTE_ACCESS_RELAY_SLUG]: enableRemoteAccessRelayFactory,
  [ENABLE_REMOTE_ACCESS_UPNP_SLUG]: enableRemoteAccessUpnpFactory,
}
