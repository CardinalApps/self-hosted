import { ENABLE_PEOPLE_IN_PHOTOS_SLUG, enablePeopleInPhotosFactory } from './enable_people_in_photos'
import { ENABLE_PLACES_IN_PHOTOS_SLUG, enablePlacesInPhotosFactory } from './enable_places_in_photos'

export const photosFields = {
  [ENABLE_PEOPLE_IN_PHOTOS_SLUG]: enablePeopleInPhotosFactory,
  [ENABLE_PLACES_IN_PHOTOS_SLUG]: enablePlacesInPhotosFactory,
}
