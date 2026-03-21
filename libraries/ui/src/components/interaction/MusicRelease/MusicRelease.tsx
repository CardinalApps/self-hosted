import { useContext, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

//import Icon from '../../typography/Icon'
import MusicPlaybackButton, { PlayButtonSizeType } from '../MusicPlaybackButton'
import { RouterContext } from '../../../context/router'
import { useReleaseCover } from '../../../hooks/useReleaseCover'
import { MusicTrackType } from '../../../store/apis/musicTracks'

//import { settingsSelectors } from '../../../store/slices/settings'

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
  coverSize?: { width?: number, height?: number },
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
  coverSize = {},
  playButtonSize,
}: PropsWithChildren<MusicReleaseProps>) => {
  const { Link } = useContext(RouterContext)
  //const { lang } = useSelector(settingsSelectors.current)
  const [showInner, setShowInner] = useState<boolean>()
  const [tracksInOrder, setTracksInOrder] = useState(tracks)
  const trackIdsInRelease = tracksInOrder.map((track) => track.musicTrackId).filter((track) => !!track)
  const coverSrc = useReleaseCover(hasArtwork ? releaseId : null)

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
        style={{ ...(getArtwork() && {
          width: coverSize?.width,
          height: coverSize?.height,
          backgroundImage: `url('${getArtwork()}')` }),
        }}
      >
        {releaseLink && Link && <Link to={releaseLink} tabIndex={-1} className="cover-link"></Link>}
        {/* {!getArtwork() && <i className="no-artwork-icon far fa-image" />} */}
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
