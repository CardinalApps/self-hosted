import { useContext } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import MusicRelease from '@cardinalapps/ui/src/components/interaction/MusicRelease'
import H3 from '@cardinalapps/ui/src/components/typography/H3'
import { RouterContext } from '@cardinalapps/ui/src/context/router'
import { formatBytes } from '@cardinalapps/ui/src/components/interaction/DiskMap'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import type { MusicTrackType } from '@cardinalapps/ui/src/store/apis/musicTracks'

import type { DiscographyEntry } from './discography'

import i18n from './i18n.json'

const COVER_SIZE = 96
// Below this many years apart, releases are just a normal gap between albums
const GAP_YEARS = 3

type ArtistTimelineProps = {
  /** Newest release first. */
  discography: DiscographyEntry[],
  onHoverRelease?: (musicReleaseId: string | null) => void,
}

/**
 * The discography as a dated spine, newest first, with release types mixed
 * rather than bucketed — which is also the only way releases whose type never
 * got tagged still land in the right place.
 */
function ArtistTimeline({
  discography,
  onHoverRelease,
}: ArtistTimelineProps) {
  const { Link } = useContext(RouterContext)
  const { lang } = useSelector(settingsSelectors.current)

  const t = (key: string) => (i18n as Record<string, Record<string, string>>)[key]?.[lang]
  const template = (key: string, values: Record<string, string>) => (
    Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), t(key) ?? '')
  )

  const formatRuntime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)

    return hours
      ? template('music-artist.timeline.runtime.hours-minutes', { h: String(hours), m: String(minutes) })
      : template('music-artist.timeline.runtime.minutes', { m: String(minutes) })
  }

  /* A release whose type was never tagged still has a shape: enough tracks and enough
     minutes make it an album, a handful of tracks an EP, anything less a single. */
  const inferType = (entry: DiscographyEntry) => {
    if (entry.numTracks >= 7 || entry.runtimeSeconds >= 25 * 60) return 'album'
    if (entry.numTracks >= 4) return 'ep'
    return 'single'
  }

  const typeLabel = (type: string) => t(`music-artist.timeline.type.${type}`) ?? type

  const formatLabel = (extensions: string[]) => {
    if (!extensions.length) return null
    const rest = extensions.length - 1
    return rest > 0
      ? `${extensions[0].toUpperCase()} ${template('music-artist.meta.plus-more', { count: String(rest) })}`
      : extensions[0].toUpperCase()
  }

  return (
    <section className="artist-timeline">
      <H3>{t('music-artist.timeline.title')}</H3>

      <ol className="artist-timeline-rows">
        {discography.map((entry, index) => {
          const previous = discography[index - 1]
          const gap = previous?.year && entry.year ? previous.year - entry.year : 0
          const type = entry.releaseType || inferType(entry)
          const heard = entry.listening?.tracksHeard ?? 0
          const releaseLink = getAppUrl('release', { params: { ':id': entry.musicReleaseId } })

          const facts = [
            typeLabel(type),
            template('music-artist.timeline.tracks', { count: String(entry.numTracks) }),
            entry.runtimeSeconds ? formatRuntime(entry.runtimeSeconds) : null,
            entry.bytes ? formatBytes(entry.bytes) : null,
            formatLabel(entry.extensions),
          ].filter(Boolean)

          return (
            <li
              key={entry.musicReleaseId || entry.id}
              className="artist-timeline-row"
              onMouseEnter={() => onHoverRelease?.(entry.musicReleaseId)}
              onMouseLeave={() => onHoverRelease?.(null)}
            >
              {gap >= GAP_YEARS && (
                <p className="artist-timeline-gap">
                  {template('music-artist.timeline.gap', { years: String(gap) })}
                </p>
              )}

              <div className="artist-timeline-entry">
                <p className="artist-timeline-year">{entry.year ?? ''}</p>

                <MusicRelease
                  className="artist-timeline-cover"
                  hasArtwork={entry.hasArtwork}
                  releaseId={entry.id}
                  tracks={entry.tracks as MusicTrackType[]}
                  releaseLink={releaseLink}
                  coverSize={{ width: COVER_SIZE, height: COVER_SIZE }}
                />

                <div className="artist-timeline-details">
                  <p className="artist-timeline-title">
                    {Link ? <Link to={releaseLink}>{entry.title}</Link> : entry.title}
                  </p>

                  <p className="artist-timeline-facts">
                    <span
                      className={clsx('artist-timeline-type', !entry.releaseType && 'is-inferred')}
                      title={!entry.releaseType ? t('music-artist.timeline.type.inferred') : undefined}
                    >
                      {facts[0]}
                    </span>
                    {facts.slice(1).map((fact) => <span key={fact}>{fact}</span>)}
                  </p>

                  {!!entry.numTracks && (
                    <p className="artist-timeline-coverage">
                      <span className="artist-timeline-coverage-bar">
                        <span style={{ width: `${(heard / entry.numTracks) * 100}%` }} />
                      </span>
                      <span className="artist-timeline-coverage-label">
                        {template('music-artist.timeline.heard', {
                          heard: String(heard),
                          total: String(entry.numTracks),
                        })}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default ArtistTimeline
