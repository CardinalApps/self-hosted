import { useContext, useMemo } from "react"

import { RouterContext } from "@cardinalapps/ui/src/context/router"
import { MusicReleaseType } from "@cardinalapps/ui/src/store/apis/musicReleases"
import List from "@cardinalapps/ui/src/components/interaction/List"
import { getAppUrl } from "@cardinalapps/ui/src/lib/net/router"

type ReleaseMetaProps = {
  release: MusicReleaseType,
}

import i18n from './i18n.json'

const UNKNOWN = '—'

type TrackMetaValue = string | number | boolean

function ReleaseMeta({
  release,
}: ReleaseMetaProps) {
  const { Link } = useContext(RouterContext)

  // Tallies every track metadata value by key so that fields can show the release-wide consensus value
  const trackMetaTallies = useMemo(() => {
    const tallies = new Map<string, Map<TrackMetaValue, number>>()

    for (const track of release?.tracks || []) {
      const rows = (track.metadata || []) as Array<{ metaKey: string, metaValue: unknown }>
      for (const { metaKey, metaValue } of rows) {
        if (metaValue === null || metaValue === '' || ['string', 'number', 'boolean'].indexOf(typeof metaValue) === -1) {
          continue
        }
        if (!tallies.has(metaKey)) {
          tallies.set(metaKey, new Map())
        }
        const values = tallies.get(metaKey)
        values.set(metaValue as TrackMetaValue, (values.get(metaValue as TrackMetaValue) || 0) + 1)
      }
    }

    return tallies
  }, [release?.tracks])

  // Returns the most common value of a track metadata key across the whole release
  const trackMeta = (key: string): TrackMetaValue | null => {
    const values = trackMetaTallies.get(key)
    if (!values?.size) {
      return null
    }
    return Array.from(values.entries()).sort((a, b) => b[1] - a[1])[0][0]
  }

  // Counts the unique discs across all tracks
  const countDiscs = () => {
    const discs = release?.tracks?.map((track) => Number(track.discNumber) || 1) || []
    const uniqueDiscs = Array.from(new Set(discs))
    return uniqueDiscs.length
  }

  // Formats total seconds as "1 hr 4 min" or "48 min"
  const formatRuntime = (seconds: number) => {
    let hours = Math.floor(seconds / 3600)
    let minutes = Math.round((seconds % 3600) / 60)
    if (minutes === 60) {
      hours += 1
      minutes = 0
    }
    if (hours) {
      return i18n['music-release.meta.runtime.hours-minutes']['en']
        .replace('{h}', String(hours))
        .replace('{m}', String(minutes))
    }
    return i18n['music-release.meta.runtime.minutes']['en'].replace('{m}', String(minutes))
  }

  const artists = release?.artists || []
  const genres = release?.genres || []

  const year = trackMeta('year') || trackMeta('releaseYear') || trackMeta('originalyear')
  const label = trackMeta('label')
  const country = trackMeta('releasecountry')

  const releaseType = release?.releaseType as string | undefined
  const releaseTypeLabel = releaseType
    ? (i18n as Record<string, Record<string, string>>)[`music-release.meta.type.${releaseType}`]?.['en'] || releaseType
    : null

  const runtimeSeconds = (release?.tracks || []).reduce((sum, track) => sum + (Number(track.duration) || 0), 0)

  // Codec plus average bitrate, e.g. "FLAC · Lossless" or "MPEG 1 Layer 3 · 320 kbps"
  const quality = () => {
    const codec = trackMeta('codec')
    if (!codec) {
      return null
    }
    if (trackMeta('lossless') === true) {
      return `${codec} · ${i18n['music-release.meta.quality.lossless']['en']}`
    }
    const bitrates = (release?.tracks || []).map((track) => Number(track.bitrate)).filter(Boolean)
    if (!bitrates.length) {
      return String(codec)
    }
    const kbps = Math.round(bitrates.reduce((sum, rate) => sum + rate, 0) / bitrates.length / 1000)
    return `${codec} · ${i18n['music-release.meta.quality.kbps']['en'].replace('{kbps}', String(kbps))}`
  }

  const addedAt = release?.createdAt ? new Date(release.createdAt as string).toLocaleDateString() : null

  return (
    <div className="release-meta">
      <p className="meta-section-title">{i18n['music-release.meta.meta']['en']}</p>
      <div className="release-meta-cols">
        <List
          className="release-meta-list"
          layout="compact"
          items={[
            {
              label: <><strong>{i18n['music-release.meta.name']['en']}</strong> <span>{release?.title || UNKNOWN}</span></>,
              title: i18n['music-release.meta.name']['en'],
            },
            {
              label: (
                <>
                  <strong>{i18n['music-release.meta.artists']['en']}</strong>
                  <span className="release-meta-artists">
                    {artists.length
                      ? artists.map((artist, index) => (
                          <span key={artist.musicArtistId as string || index}>
                            {index > 0 && ', '}
                            {Link && artist.musicArtistId
                              ? <Link to={getAppUrl('artist', { params: { ':id': artist.musicArtistId as string } })}>{artist.name as string}</Link>
                              : artist.name as string
                            }
                          </span>
                        ))
                      : i18n['music-release.meta.artists.none']['en']
                    }
                  </span>
                </>
              ),
              title: i18n['music-release.meta.artists']['en'],
            },
            {
              label: <><strong>{i18n['music-release.meta.year']['en']}</strong> <span>{year ? String(year) : UNKNOWN}</span></>,
              title: i18n['music-release.meta.year']['en'],
            },
            {
              label: <><strong>{i18n['music-release.meta.type']['en']}</strong> <span>{releaseTypeLabel || UNKNOWN}</span></>,
              title: i18n['music-release.meta.type']['en'],
            },
            {
              label: (
                <>
                  <strong>{i18n['music-release.meta.genres']['en']}</strong>
                  <span>
                    {genres.length
                      ? genres.map((genre) => genre.name).join(', ')
                      : i18n['music-release.meta.genres.none']['en']
                    }
                  </span>
                </>
              ),
              title: i18n['music-release.meta.genres']['en'],
            },
            {
              label: <><strong>{i18n['music-release.meta.label']['en']}</strong> <span>{label ? String(label) : UNKNOWN}</span></>,
              title: i18n['music-release.meta.label']['en'],
            },
          ]}
        />
        <List
          className="release-meta-list"
          layout="compact"
          items={[
            {
              label: <><strong>{i18n['music-release.meta.tracks']['en']}</strong> <span>{release?.tracks?.length.toString() || '0'}</span></>,
              title: i18n['music-release.meta.tracks']['en'],
            },
            {
              label: <><strong>{i18n['music-release.meta.discs']['en']}</strong> <span>{countDiscs()}</span></>,
              title: i18n['music-release.meta.discs']['en'],
            },
            {
              label: <><strong>{i18n['music-release.meta.runtime']['en']}</strong> <span>{runtimeSeconds ? formatRuntime(runtimeSeconds) : UNKNOWN}</span></>,
              title: i18n['music-release.meta.runtime']['en'],
            },
            {
              label: <><strong>{i18n['music-release.meta.quality']['en']}</strong> <span>{quality() || UNKNOWN}</span></>,
              title: i18n['music-release.meta.quality']['en'],
            },
            {
              label: <><strong>{i18n['music-release.meta.country']['en']}</strong> <span>{country ? String(country) : UNKNOWN}</span></>,
              title: i18n['music-release.meta.country']['en'],
            },
            {
              label: <><strong>{i18n['music-release.meta.added']['en']}</strong> <span>{addedAt || UNKNOWN}</span></>,
              title: i18n['music-release.meta.added']['en'],
            },
          ]}
        />
      </div>
    </div>
  )
}

export default ReleaseMeta
