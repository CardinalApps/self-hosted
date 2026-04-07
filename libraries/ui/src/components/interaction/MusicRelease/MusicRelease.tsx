import { useContext, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import MusicPlaybackButton, { PlayButtonSizeType } from '../MusicPlaybackButton'
import { RouterContext } from '../../../context/router'
import { useReleaseCover } from '../../../hooks/useReleaseCover'
import { MusicTrackType } from '../../../store/apis/musicTracks'

import './MusicRelease.css'

type MusicReleaseProps = {
  className?: string,
  overrideArtwork?: string,
  hasArtwork?: boolean,
  hasControls?: boolean,
  tracks?: MusicTrackType[],
  releaseTitle?: string,
  releaseId?: string | number,
  releaseYear?: string,
  releaseLink?: string,
  artistName?: string,
  artistLink?: string,
  coverSize?: { width?: number | string, height?: number | string },
  playButtonSize?: PlayButtonSizeType,
}

const MusicRelease = ({
  className,
  overrideArtwork,
  hasArtwork = true,
  hasControls = true,
  tracks = [],
  releaseTitle,
  releaseId,
  releaseYear,
  releaseLink,
  artistName,
  artistLink,
  coverSize = { width: 200, height: 200 },
  playButtonSize,
}: PropsWithChildren<MusicReleaseProps>) => {
  const { Link } = useContext(RouterContext)
  const [showInner, setShowInner] = useState<boolean>()
  const [tracksInOrder, setTracksInOrder] = useState(tracks)
  const trackIdsInRelease = tracksInOrder.map((track) => track.musicTrackId).filter((track) => !!track)
  const [coverSrc, { coverIsLoading }] = useReleaseCover(hasArtwork ? releaseId : null)

  const getArtwork = () => {
    if (overrideArtwork) {
      return overrideArtwork
    }
    return coverSrc
  }

  useEffect(() => {
    if (!tracks.length) {
      return
    }
    const ordered = [...tracks]
    ordered.sort((a, b) => a?.trackNumber > b?.trackNumber ? 1 : -1)
    setTracksInOrder(ordered)
  }, [tracks])

  return (
    <div className={clsx(`music-release`, className, !!showInner && 'show', !getArtwork() && 'no-artwork')}>
      <div
        className="music-release-art"
        onFocus={() => hasControls ? setShowInner(true) : null}
        onBlur={() => hasControls ? setShowInner(false) : null}
        onMouseEnter={() => hasControls ?setShowInner(true) : null}
        onMouseLeave={() => hasControls ? setShowInner(false) : null}
        style={{
          width: coverSize?.width,
          height: coverSize?.height,
          ...(getArtwork() ? { backgroundImage: `url('${getArtwork()}')` } : {} ),
        }}
      >
        {releaseLink && Link && <Link to={releaseLink} tabIndex={-1} className="cover-link"></Link>}
        {!coverIsLoading && !getArtwork() && <div className="checkered" />}
        {!!hasControls && (
          <div className="controls">
            <div className="col music-track-play-pause">
              <MusicPlaybackButton
                size={playButtonSize}
                musicTrackIds={trackIdsInRelease}
                musicTrackIdToPlay={trackIdsInRelease?.[0]}
              />
            </div>
            {/* <div className="col music-track-favorite">
              <Icon fa="fas fa-star" hoverType="icon" onClick={() => console.log('fav')} />
            </div> */}
          </div>
        )}
      </div>
      {(releaseTitle || artistName || releaseYear) && (
        <div className="meta">
          <div className="row">
            {!!releaseTitle && (
              <p className="release-name">
                {releaseLink && releaseTitle && Link
                  ? <Link to={releaseLink}>{releaseTitle}</Link>
                  : releaseTitle
                }
              </p>
            )}
          </div>
          <div className="row">
            {!!artistName && (
              <p className="artist-name">
                {artistLink && artistName && Link
                  ? <Link to={artistLink}>{artistName}</Link>
                  : artistName
                }
              </p>
            )}
            {!!releaseYear && <p className="release-year">{releaseYear}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default MusicRelease
