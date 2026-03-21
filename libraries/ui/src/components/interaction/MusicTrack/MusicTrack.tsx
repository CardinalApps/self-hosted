import { useContext, type PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'

import Icon from '../../typography/Icon'
import MusicPlaybackButton from '../MusicPlaybackButton'

import { settingsSelectors } from '../../../store/slices/settings'
import { audioSelectors } from '../../../store/slices/music'
import play from '../../../store/slices/music/thunks/play'
import { RouterContext } from '../../../context/router'
import { useReleaseCover } from '../../../hooks/useReleaseCover'
import { useAppDispatch } from '../../../hooks/useAppDispatch'

import i18n from './i18n'

import './MusicTrack.css'
import { pluralize } from '../../../lib/formatting/text'

type MusicTrackProps = {
  musicTrackId?: string,
  trackNumber?: number,
  trackTitle?: string,
  releaseTitle?: string,
  releaseId?: number,
  releaseLink?: string,
  artistName?: string,
  artistLink?: string,
  duration?: string,
  plays?: number,
  hasArtwork?: boolean,
  canFav?: boolean,
}

const MusicTrack = ({
  musicTrackId,
  trackNumber,
  trackTitle,
  releaseTitle,
  releaseId,
  releaseLink,
  artistName,
  artistLink,
  duration,
  plays,
  hasArtwork = true,
  canFav = true,
}: PropsWithChildren<MusicTrackProps>) => {
  const dispatch = useAppDispatch()
  const { Link } = useContext(RouterContext)
  const { lang } = useSelector(settingsSelectors.current)
  const playing = useSelector(audioSelectors.playing)
  const artwork = useReleaseCover(hasArtwork ? releaseId : null)

  const handleDoubleClick = (e) => {
    if (
      !playing.length
      && !e.target.matches('button')
      && !e.target.closest('button')
      && !e.target.matches('.music-playback-button')
      && !e.target.closest('.music-playback-button')
    ) {
      dispatch(play({
        trackIds: [musicTrackId],
      }))
    }
  }

  return (
    <div className="music-track" onDoubleClick={handleDoubleClick}>
      <div className="col music-track-play-pause">
        <MusicPlaybackButton musicTrackIds={[musicTrackId]} musicTrackIdToPlay={musicTrackId} />
      </div>
      {!!trackNumber && <p className="col music-track-number">{trackNumber}.</p>}
      <div className="col music-track-info">
        {!!trackTitle && <p className="music-track-title">{trackTitle}</p>}
        {!!(releaseTitle || artistName) &&
          <div className="music-release">
            {!!releaseTitle &&
              <p className="music-release-title">
                {Link && releaseLink
                  ? <Link to={releaseLink}>{}</Link>
                  : releaseTitle
                }
              </p>
            }
            {!!artistName &&
              <p className="music-release-artist">
                <span className="sep">—</span>
                {Link && artistLink
                  ? <Link to={artistLink}>{artistName}</Link>
                  : artistName
                }
              </p>
            }
          </div>
        }
      </div>
      {!!duration && <p className="col music-track-duration">{duration}</p>}
      {typeof plays !== 'undefined' && (
        <p
          className="col music-track-plays"
          title={pluralize(plays, i18n['playcount.title.singular'][lang], i18n['playcount.title.plural'][lang]).replace('{num}', plays)}
        >
          <span>{plays}</span>
        </p>
      )}
      {!!canFav &&
        <div className="col music-track-favorite">
          <Icon fa="fas fa-star" hoverType="icon" onClick={() => console.log('fav')} />
        </div>
      }
      {!!artwork &&
        <div className="col music-track-artwork">
          <img src={artwork} />
        </div>
      }
    </div>
  )
}

export default MusicTrack
