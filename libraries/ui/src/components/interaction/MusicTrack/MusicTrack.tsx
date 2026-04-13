import { useContext, useState, useEffect, type PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'

import MusicPlaybackButton from '../MusicPlaybackButton'
import Ratings from '../Ratings'

import { settingsSelectors } from '../../../store/slices/settings'
import { audioSelectors } from '../../../store/slices/music'
import play from '../../../store/slices/music/thunks/play'
import { RouterContext } from '../../../context/router'
import { useReleaseCover } from '../../../hooks/useReleaseCover'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { useSetRatingMutation, useDeleteRatingMutation } from '../../../store/apis/ratings'

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
  rating?: number | null,
  hasArtwork?: boolean,
  canRate?: boolean,
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
  rating,
  hasArtwork = true,
  canRate = true,
}: PropsWithChildren<MusicTrackProps>) => {
  const dispatch = useAppDispatch()
  const { Link } = useContext(RouterContext)
  const { lang, max_rating: maxRatingSetting } = useSelector(settingsSelectors.current)
  const maxRating = (maxRatingSetting as number) ?? 1
  const playing = useSelector(audioSelectors.playing)
  const [artwork] = useReleaseCover(hasArtwork ? releaseId : null)

  const [localRating, setLocalRating] = useState<number | null>(rating ?? null)
  const [setRating] = useSetRatingMutation()
  const [deleteRating] = useDeleteRatingMutation()

  useEffect(() => {
    setLocalRating(rating ?? null)
  }, [rating])

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

  const handleRatingChange = async (newRating: number | null) => {
    if (!musicTrackId) return
    if (newRating === null) {
      setLocalRating(null)
      await deleteRating({ trackId: musicTrackId })
    } else {
      setLocalRating(newRating)
      await setRating({ trackId: musicTrackId, rating: newRating })
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
      {!!canRate &&
        <div className="col music-track-rating">
          <Ratings
            rating={localRating}
            maxRating={maxRating}
            lang={lang}
            onChange={handleRatingChange}
          />
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
