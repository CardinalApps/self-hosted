import { useContext, type CSSProperties } from 'react'
import { useSelector } from 'react-redux'

import MusicRelease from '@cardinalapps/ui/src/components/interaction/MusicRelease'
import MusicTrack from '@cardinalapps/ui/src/components/interaction/MusicTrack'
import Beads from '@cardinalapps/ui/src/components/layout/Beads'
import H3 from '@cardinalapps/ui/src/components/typography/H3'
import { RouterContext } from '@cardinalapps/ui/src/context/router'
import { formatBytes } from '@cardinalapps/ui/src/components/interaction/DiskMap'
import { secondsToMMSS } from '@cardinalapps/ui/src/lib/formatting/time'
import { getAppUrl } from '@cardinalapps/ui/src/lib/net/router'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import type { MusicTrackType } from '@cardinalapps/ui/src/store/apis/musicTracks'

import type { DiscographyEntry } from './discography'

import i18n from './i18n.json'

const COVER_SIZE = 300
// Below this many years apart, releases are just a normal gap between albums
const GAP_YEARS = 3

type ArtistTimelineProps = {
  /** Newest release first. */
  discography: DiscographyEntry[],
  artistName?: string,
  artistLink?: string,
}

/**
 * The discography as a dated spine, newest first, with release types mixed
 * rather than bucketed — which is also the only way releases whose type never
 * got tagged still land in the right place.
 */
function ArtistTimeline({
  discography,
  artistName,
  artistLink,
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
          const releaseLink = getAppUrl('release', { params: { ':id': entry.musicReleaseId } })

          const facts = [
            template('music-artist.timeline.tracks', { count: String(entry.numTracks) }),
            entry.runtimeSeconds ? formatRuntime(entry.runtimeSeconds) : null,
            entry.bytes ? formatBytes(entry.bytes) : null,
            formatLabel(entry.extensions),
          ].filter(Boolean)

          // Track order, same as the beads above it
          const favoriteTracks = entry.tracks.filter((track) => Number(track.rating) > 0)

          return (
            <li
              key={entry.musicReleaseId || entry.id}
              className="artist-timeline-row"
            >
              {gap >= GAP_YEARS && (
                // The years drive how much air the gap gets, which the stylesheet caps
                <p className="artist-timeline-gap" style={{ '--gap-years': gap } as CSSProperties}>
                  <i className="fas fa-chevron-up" />
                  {template('music-artist.timeline.gap', { years: String(gap) })}
                  <i className="fas fa-chevron-down" />
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
                    {!!entry.releaseType && (
                      <span className="artist-timeline-type">{typeLabel(entry.releaseType)}</span>
                    )}
                    {facts.map((fact) => <span key={fact}>{fact}</span>)}
                  </p>

                  {!!entry.tracks.length && (
                    <Beads
                      className="artist-timeline-beads"
                      beads={entry.tracks.map((track) => ({
                        id: track.musicTrackId,
                        value: track.playCount,
                        // Unplayed tracks read as an outline rather than the smallest filled bead
                        ...(track.playCount > 0 ? {} : { color: 'transparent', borderColor: 'var(--accent-color)' }),
                      }))}
                    />
                  )}

                  {!!favoriteTracks.length && (
                    <div className="artist-timeline-favorites">
                      {favoriteTracks.map((track) => {
                        const trackIndex = entry.tracks.findIndex((t) => t.musicTrackId === track.musicTrackId)
                        const musicTrackIds = entry.tracks.slice(Math.max(trackIndex, 0)).map((t) => t.musicTrackId)

                        return (
                          <MusicTrack
                            key={track.musicTrackId}
                            musicTrackId={track.musicTrackId}
                            trackNumber={track.trackNumber}
                            trackTitle={track.title}
                            releaseTitle={entry.title}
                            releaseId={entry.id}
                            releaseLink={releaseLink}
                            artistName={artistName}
                            artistLink={artistLink}
                            duration={secondsToMMSS(Number(track.duration) || 0)}
                            plays={track.playCount}
                            rating={track.rating}
                            hasArtwork={entry.hasArtwork}
                            musicTrackIds={musicTrackIds}
                          />
                        )
                      })}
                    </div>
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
