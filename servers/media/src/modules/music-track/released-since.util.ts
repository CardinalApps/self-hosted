import { ObjectLiteral, SelectQueryBuilder } from 'typeorm'

/*
  Metadata keys that can carry a real-world release date. Full-date keys usually
  hold YYYY-MM-DD but degrade to bare years in the wild; year keys always hold
  bare years.
*/
const FULL_DATE_KEYS = ['originaldate', 'date']
const YEAR_KEYS = ['originalyear', 'year', 'releaseYear']

// How recently released in real life music must be to count as fresh
export const FRESH_WINDOW_DAYS = 365

// Today minus the fresh window, as YYYY-MM-DD
export function freshCutoffIso(): string {
  return new Date(Date.now() - FRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * Filters a music_track query down to tracks whose file metadata says they were
 * released on or after the cutoff. Full YYYY-MM-DD values compare exactly.
 * Year-only values count optimistically as December 31 of their year, so a bare
 * "2025" tag qualifies for any cutoff that falls inside 2025.
 */
export function applyReleasedSince(qb: SelectQueryBuilder<ObjectLiteral>, trackAlias: string, cutoffIso: string): void {
  qb.andWhere(`EXISTS (
    SELECT 1 FROM music_track_metadata released
    WHERE released.track_id = ${trackAlias}.id
    AND (
      (
        released.meta_key IN (:...releasedFullDateKeys)
        AND length(released.meta_value) = 10
        AND released.meta_value >= :releasedCutoffIso
      )
      OR (
        (
          released.meta_key IN (:...releasedYearKeys)
          OR (released.meta_key IN (:...releasedFullDateKeys) AND length(released.meta_value) = 4)
        )
        AND substr(released.meta_value, 1, 4) BETWEEN '1000' AND '9999'
        AND substr(released.meta_value, 1, 4) >= :releasedCutoffYear
      )
    )
  )`, {
    releasedFullDateKeys: FULL_DATE_KEYS,
    releasedYearKeys: YEAR_KEYS,
    releasedCutoffIso: cutoffIso,
    releasedCutoffYear: cutoffIso.slice(0, 4),
  })
}
