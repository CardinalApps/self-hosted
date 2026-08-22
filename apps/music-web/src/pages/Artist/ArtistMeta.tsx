import { useSelector } from 'react-redux'

import ExternalLinks from '@cardinalapps/ui/src/components/interaction/ExternalLinks'
import List from '@cardinalapps/ui/src/components/interaction/List'
import Tags, { type TagProps } from '@cardinalapps/ui/src/components/interaction/Tags'
import { formatBytes } from '@cardinalapps/ui/src/components/interaction/DiskMap'
import { countryName } from '@cardinalapps/ui/src/lib/formatting/country'
import { secondsToMMSS } from '@cardinalapps/ui/src/lib/formatting/time'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import type { MusicArtistType } from '@cardinalapps/ui/src/store/apis/musicArtists'
import type { MusicTrackType } from '@cardinalapps/ui/src/store/apis/musicTracks'


import i18n from './i18n.json'

const UNKNOWN = '—'
const MAX_ENCODERS = 2

/* The key-stat tags name two genres and count the rest, and the count is capped rather than
   true: past five an exact tail says nothing that "a lot" doesn't. */
const TAG_GENRES_NAMED = 2
const TAG_GENRES_COUNTED = 5

type ArtistMetaProps = {
  artist: MusicArtistType,
  tracks: MusicTrackType[],
  /** Draws shimmer bars in place of the values while the summary is on its way. */
  loading?: boolean,
}

type MetaRow = {
  labelKey: keyof typeof i18n,
  value: string | null,
}

/**
 * The artist's numbers in one scrolling column: what the collection holds, what
 * it costs on disk, and what the current user has done with it.
 */
function ArtistMeta({
  artist,
  tracks,
  loading = false,
}: ArtistMetaProps) {
  const { lang } = useSelector(settingsSelectors.current)
  const summary = artist?.summary
  const listening = summary?.listening

  const t = (key: keyof typeof i18n) => i18n[key][lang]
  const template = (key: keyof typeof i18n, values: Record<string, string>) => (
    Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), t(key))
  )

  // Formats total seconds as "4 hr 3 min" or "48 min"
  const formatRuntime = (seconds: number) => {
    let hours = Math.floor(seconds / 3600)
    let minutes = Math.round((seconds % 3600) / 60)

    if (minutes === 60) {
      hours += 1
      minutes = 0
    }

    return hours
      ? template('music-artist.meta.runtime.hours-minutes', { h: String(hours), m: String(minutes) })
      : template('music-artist.meta.runtime.minutes', { m: String(minutes) })
  }

  const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString() : null

  // Joins a list, keeping it to `max` entries with a "+3" tail for the rest
  const summarizeList = (values: string[], max: number) => {
    if (!values.length) {
      return null
    }

    const shown = values.slice(0, max).join(', ')
    const rest = values.length - max

    return rest > 0
      ? `${shown} ${template('music-artist.meta.plus-more', { count: String(rest) })}`
      : shown
  }

  const years = () => {
    if (!summary?.firstYear) {
      return null
    }
    return summary.lastYear && summary.lastYear !== summary.firstYear
      ? `${summary.firstYear}–${summary.lastYear}`
      : String(summary.firstYear)
  }

  const trackLength = () => {
    const { shortestTrackSeconds: shortest, longestTrackSeconds: longest } = summary ?? {}
    if (!shortest || !longest) {
      return null
    }
    return `${secondsToMMSS(shortest)} – ${secondsToMMSS(longest)}`
  }

  const quality = () => {
    const rates = (summary?.sampleRates ?? [])
      .map((rate) => template('music-artist.meta.khz', { khz: String(Math.round(rate / 100) / 10) }))
    const depths = (summary?.bitDepths ?? [])
      .map((depth) => template('music-artist.meta.bit-depth', { bits: String(depth) }))
    const parts = [rates.join(', '), depths.join(', ')].filter(Boolean)

    return parts.length ? parts.join(' · ') : null
  }

  const mostPlayed = () => {
    const played = tracks.filter((track) => Number(track?.playCount) > 0)

    if (!played.length) {
      return null
    }

    const top = played.reduce((best, track) => Number(track.playCount) > Number(best.playCount) ? track : best)
    const times = template('music-artist.meta.times-played', { count: String(top.playCount) })

    return `${top.title} ${times}`
  }

  /*
    The four figures worth having before the table is read at all. They are named in the tag
    itself rather than labelled, so they are lifted out of the sections below rather than
    repeated there.
  */
  const keyStats = (): TagProps[] => {
    const genres = (summary?.genres ?? []).map((genre) => genre.name)
    const namedGenres = genres.slice(0, TAG_GENRES_NAMED)
    const otherGenres = Math.min(genres.length - namedGenres.length, TAG_GENRES_COUNTED - TAG_GENRES_NAMED)

    const genreList = otherGenres > 0
      ? [...namedGenres, template('music-artist.meta.plus-more', { count: String(otherGenres) })]
      : namedGenres

    const stats: (TagProps | null)[] = [
      summary?.numReleases ? {
        icon: 'fas fa-compact-disc',
        label: template(
          summary.numReleases === 1 ? 'music-artist.meta.tag.release' : 'music-artist.meta.tag.releases',
          { count: String(summary.numReleases) },
        ),
      } : null,
      summary?.numTracks ? {
        icon: 'fas fa-file-audio',
        label: template(
          summary.numTracks === 1 ? 'music-artist.meta.tag.track' : 'music-artist.meta.tag.tracks',
          { count: String(summary.numTracks) },
        ),
      } : null,
      genreList.length ? { icon: 'fas fa-tags', label: genreList.join(', ') } : null,
      summary?.bytes ? { icon: 'fas fa-hdd', label: formatBytes(summary.bytes) } : null,
    ]

    return stats.filter(Boolean)
  }

  const stats = keyStats()

  const collection: MetaRow[] = [
    { labelKey: 'music-artist.meta.name', value: artist?.name ?? null },
    { labelKey: 'music-artist.meta.runtime', value: summary?.runtimeSeconds ? formatRuntime(summary.runtimeSeconds) : null },
    { labelKey: 'music-artist.meta.years', value: years() },
    { labelKey: 'music-artist.meta.labels', value: summarizeList(summary?.labels ?? [], MAX_ENCODERS) },
    { labelKey: 'music-artist.meta.track-length', value: trackLength() },
    { labelKey: 'music-artist.meta.sample-rate', value: quality() },
    { labelKey: 'music-artist.meta.encoders', value: summarizeList(summary?.encoders ?? [], MAX_ENCODERS) },
    { labelKey: 'music-artist.meta.media', value: summarizeList(summary?.mediaTypes ?? [], MAX_ENCODERS) },
    {
      labelKey: 'music-artist.meta.country',
      value: summarizeList((summary?.countries ?? []).map((code) => countryName(code, lang)), MAX_ENCODERS),
    },
  ]

  const yourListening: MetaRow[] = [
    { labelKey: 'music-artist.meta.plays', value: listening ? String(listening.plays) : null },
    {
      labelKey: 'music-artist.meta.heard',
      value: listening && summary?.numTracks
        ? template('music-artist.meta.heard-of', { heard: String(listening.tracksHeard), total: String(summary.numTracks) })
        : null,
    },
    { labelKey: 'music-artist.meta.favorites', value: listening ? String(listening.favorites) : null },
    { labelKey: 'music-artist.meta.most-played', value: mostPlayed() },
    { labelKey: 'music-artist.meta.first-played', value: formatDate(listening?.firstPlayedAt ?? null) },
    { labelKey: 'music-artist.meta.last-played', value: formatDate(listening?.lastPlayedAt ?? null) },
    { labelKey: 'music-artist.meta.added', value: formatDate((artist?.createdAt as string) ?? null) },
  ]

  const toListItems = (rows: MetaRow[]) => rows.map((row) => ({
    label: (
      <>
        <strong>{t(row.labelKey)}</strong>
        {loading
          ? <span className="meta-value-skeleton" />
          : <span>{row.value || UNKNOWN}</span>}
      </>
    ),
    title: t(row.labelKey),
  }))

  return (
    <div className="artist-meta-pane">
      <div className="artist-meta-row">
        <Tags tags={stats} />
        <ExternalLinks ids={{ musicbrainzArtistId: summary?.musicbrainzArtistId }} />
      </div>

      <div className="artist-meta">
        <div className="artist-meta-cols">
          <div className="artist-meta-col">
            <p className="meta-section-title">{t('music-artist.meta.collection')}</p>
            <List className="artist-meta-list" layout="compact" items={toListItems(collection)} />
          </div>

          <div className="artist-meta-col">
            <p className="meta-section-title">{t('music-artist.meta.listening')}</p>
            <List className="artist-meta-list" layout="compact" items={toListItems(yourListening)} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArtistMeta
