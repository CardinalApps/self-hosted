/**
 * Every external identifier Cardinal can currently read out of a file's
 * embedded metadata. Pages hand over whatever they happen to have; the link
 * list is built from the subset that is actually present.
 */
export type ExternalIds = {
  musicbrainzArtistId?: string | null
  musicbrainzReleaseId?: string | null
  musicbrainzReleaseGroupId?: string | null
  musicbrainzRecordingId?: string | null
  isrc?: string | null
  barcode?: string | null
  asin?: string | null
  catalogNumber?: string | null
}

export type ExternalProviderId = 'musicbrainz' | 'discogs' | 'amazon'

export type ExternalLink = {
  /** Stable key, unique within one list. */
  id: string
  providerId: ExternalProviderId
  /** i18n key for the link's label. */
  labelKey: string
  url: string
}

const MUSICBRAINZ = 'https://musicbrainz.org'
const DISCOGS_SEARCH = 'https://www.discogs.com/search/'
const AMAZON = 'https://www.amazon.com/dp'

const discogsSearch = (query: string, type: 'release' | 'artist'): string => (
  `${DISCOGS_SEARCH}?q=${encodeURIComponent(query)}&type=${type}`
)

/**
 * Turns a set of identifiers into outbound links, in the order they should be
 * offered. Nothing is fetched and no identifier is sent anywhere until the user
 * actually clicks a link, which matters for a self-hosted app.
 */
export function buildExternalLinks(ids: ExternalIds): ExternalLink[] {
  const links: ExternalLink[] = []

  const push = (
    id: string,
    providerId: ExternalProviderId,
    labelKey: string,
    value: string | null | undefined,
    toUrl: (value: string) => string,
  ) => {
    const trimmed = value?.trim()
    if (trimmed) {
      links.push({ id, providerId, labelKey, url: toUrl(trimmed) })
    }
  }

  push('mb-artist', 'musicbrainz', 'external-links.musicbrainz.artist', ids.musicbrainzArtistId,
    (value) => `${MUSICBRAINZ}/artist/${encodeURIComponent(value)}`)

  push('mb-release-group', 'musicbrainz', 'external-links.musicbrainz.release-group', ids.musicbrainzReleaseGroupId,
    (value) => `${MUSICBRAINZ}/release-group/${encodeURIComponent(value)}`)

  push('mb-release', 'musicbrainz', 'external-links.musicbrainz.release', ids.musicbrainzReleaseId,
    (value) => `${MUSICBRAINZ}/release/${encodeURIComponent(value)}`)

  push('mb-recording', 'musicbrainz', 'external-links.musicbrainz.recording', ids.musicbrainzRecordingId,
    (value) => `${MUSICBRAINZ}/recording/${encodeURIComponent(value)}`)

  push('mb-isrc', 'musicbrainz', 'external-links.musicbrainz.isrc', ids.isrc,
    (value) => `${MUSICBRAINZ}/isrc/${encodeURIComponent(value)}`)

  /* Discogs has no ID in embedded tags, so these are searches by the printed
     identifiers rather than direct links to a page. */
  push('discogs-barcode', 'discogs', 'external-links.discogs.barcode', ids.barcode,
    (value) => discogsSearch(value, 'release'))

  push('discogs-catno', 'discogs', 'external-links.discogs.catalog-number', ids.catalogNumber,
    (value) => discogsSearch(value, 'release'))

  push('amazon-asin', 'amazon', 'external-links.amazon.asin', ids.asin,
    (value) => `${AMAZON}/${encodeURIComponent(value)}`)

  return links
}
