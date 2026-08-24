import { useSelector } from 'react-redux'
import clsx from 'clsx'

import { settingsSelectors } from '../../../store/slices/settings'

import i18n from './i18n'

import './MusicTrackGhost.css'

type MusicTrackGhostProps = {
  className?: string,
  /** Replaces the default line of text where a track title would be. */
  label?: string,
}

/**
 * A MusicTrack that isn't there: same shape and columns, but drawn as an outline
 * and completely inert. Used to give empty track lists something to hold.
 */
const MusicTrackGhost = ({
  className,
  label,
}: MusicTrackGhostProps) => {
  const { lang, max_rating: maxRatingSetting } = useSelector(settingsSelectors.current)
  const maxRating = (maxRatingSetting as number) ?? 1

  return (
    <div className={clsx('music-track-ghost', className)} aria-hidden="true">
      <div className="music-track-ghost-col music-track-ghost-play">
        <span className="music-track-ghost-play-button">
          <i className="fas fa-play" />
        </span>
      </div>
      <p className="music-track-ghost-col music-track-ghost-label">{label ?? i18n['label'][lang]}</p>
      <div className="music-track-ghost-col music-track-ghost-rating">
        {[...Array(maxRating)].map((_, i) => (
          <span key={i} className="music-track-ghost-star">
            <i className="fas fa-star" />
          </span>
        ))}
      </div>
      <div className="music-track-ghost-col music-track-ghost-artwork">
        <span className="music-track-ghost-frame" />
      </div>
    </div>
  )
}

export default MusicTrackGhost
