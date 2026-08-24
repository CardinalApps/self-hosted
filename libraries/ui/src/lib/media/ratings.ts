/*
 * Ratings are a 0-1 float and a favorite is exactly 1 (100%). This mirrors FAVORITE_THRESHOLD in the
 * Media Server's rating module; keep the two definitions in sync.
 */

// Whether a rating value counts as a favorite
export function isFavorite(rating: number | string | null | undefined): boolean {
  return Number(rating) === 1
}
