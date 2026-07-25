import { useSelector } from 'react-redux'

import ExternalLinks from '@cardinalapps/ui/src/components/interaction/ExternalLinks'
import List from '@cardinalapps/ui/src/components/interaction/List'
import { formatBytes } from '@cardinalapps/ui/src/components/interaction/DiskMap'
import { countryName } from '@cardinalapps/ui/src/lib/formatting/country'
import { secondsToMMSS } from '@cardinalapps/ui/src/lib/formatting/time'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import type { MusicArtistType } from '@cardinalapps/ui/src/store/apis/musicArtists'
import type { MusicTrackType } from '@cardinalapps/ui/src/store/apis/musicTracks'

import { isLosslessExtension } from './discography'

import i18n from './i18n.json'

const UNKNOWN = '—'
const MAX_GENRES = 3
const MAX_ENCODERS = 2

type ArtistMetaProps = {
  artist: MusicArtistType,
  tracks: MusicTrackType[],
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

  const formats = () => {
    if (!summary?.formats?.length) {
      return null
    }
    return summary.formats
      .map((format) => `${format.numTracks} ${format.extension.toUpperCase()}`)
      .join(' · ')
  }

  const losslessShare = () => {
    if (!summary?.numTracks) {
      return null
    }
    return `${Math.round((summary.numLossless / summary.numTracks) * 100)}%`
  }

  /*
    Averaging a FLAC rip's ~900 kbps in with the MP3s would report a bitrate that describes
    nothing, so this is the lossy average. Artists that are lossless throughout fall back to
    the whole set, where the figure means something again.
  */
  const bitrate = () => {
    const rated = (summary?.formats ?? []).filter((format) => format.avgBitrate)
    const lossy = rated.filter((format) => !isLosslessExtension(format.extension))
    const counted = lossy.length ? lossy : rated

    if (!counted.length) {
      return null
    }

    const tracked = counted.reduce((sum, format) => sum + format.numTracks, 0)
    const weighted = counted.reduce((sum, format) => sum + format.avgBitrate * format.numTracks, 0)

    return template('music-artist.meta.kbps', { kbps: String(Math.round(weighted / tracked / 1000)) })
  }

  const quality = () => {
    const rates = (summary?.sampleRates ?? [])
      .map((rate) => template('music-artist.meta.khz', { khz: String(Math.round(rate / 100) / 10) }))
    const depths = (summary?.bitDepths ?? [])
      .map((depth) => template('music-artist.meta.bit-depth', { bits: String(depth) }))
    const parts = [rates.join(', '), depths.join(', ')].filter(Boolean)

    return parts.length ? parts.join(' · ') : null
  }

  const loudness = () => {
    if (summary?.integratedLufs === null || summary?.integratedLufs === undefined) {
      return null
    }

    const lufs = template('music-artist.meta.lufs', { lufs: summary.integratedLufs.toFixed(1) })

    if (summary.truePeakDb === null || summary.truePeakDb === undefined) {
      return lufs
    }

    const peak = `${summary.truePeakDb > 0 ? '+' : ''}${summary.truePeakDb.toFixed(1)}`
    return `${lufs} · ${template('music-artist.meta.peak', { peak })}`
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

  const collection: MetaRow[] = [
    { labelKey: 'music-artist.meta.name', value: artist?.name ?? null },
    { labelKey: 'music-artist.meta.releases', value: summary ? String(summary.numReleases) : null },
    { labelKey: 'music-artist.meta.tracks', value: summary ? String(summary.numTracks) : null },
    { labelKey: 'music-artist.meta.runtime', value: summary?.runtimeSeconds ? formatRuntime(summary.runtimeSeconds) : null },
    { labelKey: 'music-artist.meta.years', value: years() },
    {
      labelKey: 'music-artist.meta.genres',
      value: summarizeList((summary?.genres ?? []).map((genre) => genre.name), MAX_GENRES),
    },
    { labelKey: 'music-artist.meta.labels', value: summarizeList(summary?.labels ?? [], MAX_ENCODERS) },
    { labelKey: 'music-artist.meta.track-length', value: trackLength() },
  ]

  const onDisk: MetaRow[] = [
    { labelKey: 'music-artist.meta.size', value: summary?.bytes ? formatBytes(summary.bytes) : null },
    {
      labelKey: 'music-artist.meta.per-track',
      value: summary?.bytes && summary?.numTracks ? formatBytes(Math.round(summary.bytes / summary.numTracks)) : null,
    },
    { labelKey: 'music-artist.meta.formats', value: formats() },
    { labelKey: 'music-artist.meta.lossless', value: losslessShare() },
    { labelKey: 'music-artist.meta.bitrate', value: bitrate() },
    { labelKey: 'music-artist.meta.sample-rate', value: quality() },
    { labelKey: 'music-artist.meta.encoders', value: summarizeList(summary?.encoders ?? [], MAX_ENCODERS) },
    { labelKey: 'music-artist.meta.media', value: summarizeList(summary?.mediaTypes ?? [], MAX_ENCODERS) },
    {
      labelKey: 'music-artist.meta.country',
      value: summarizeList((summary?.countries ?? []).map((code) => countryName(code, lang)), MAX_ENCODERS),
    },
    { labelKey: 'music-artist.meta.loudness', value: loudness() },
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
    name: <><strong>{t(row.labelKey)}</strong> <span>{row.value || UNKNOWN}</span></>,
    title: t(row.labelKey),
  }))

  return (
    <div className="artist-meta-pane">
      <div className="artist-meta-row">
        <ExternalLinks ids={{ musicbrainzArtistId: summary?.musicbrainzArtistId }} />
      </div>

      <div className="artist-meta">
        <p className="meta-section-title">{t('music-artist.meta.collection')}</p>
        <List className="artist-meta-list" layout="compact" items={toListItems(collection)} />

        <p className="meta-section-title">{t('music-artist.meta.on-disk')}</p>
        <List className="artist-meta-list" layout="compact" items={toListItems(onDisk)} />

        <p className="meta-section-title">{t('music-artist.meta.listening')}</p>
        <List className="artist-meta-list" layout="compact" items={toListItems(yourListening)} />
      </div>
    </div>
  )
}

export default ArtistMeta
