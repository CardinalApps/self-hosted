import { useSelector } from 'react-redux'
import clsx from 'clsx'

import { settingsSelectors } from '../../../store/slices/settings'

import i18n from './i18n'

import './MusicReleaseGhost.css'

type MusicReleaseGhostProps = {
  className?: string,
  /** Replaces the default line of text where a release title would be. */
  releaseTitle?: string,
  coverSize?: { width?: number | string, height?: number | string },
}

/**
 * A MusicRelease that isn't there: an empty cover frame and a title, drawn to the
 * same size and completely inert. Used to give empty release lists something to hold.
 */
const MusicReleaseGhost = ({
  className,
  releaseTitle,
  coverSize = { width: 200, height: 200 },
}: MusicReleaseGhostProps) => {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <div
      className={clsx('music-release-ghost', className)}
      style={{ width: coverSize?.width }}
      aria-hidden="true"
    >
      <div
        className="music-release-ghost-art"
        style={{ width: coverSize?.width, height: coverSize?.height }}
      >
        <span className="music-release-ghost-play-button">
          <i className="fas fa-play" />
        </span>
      </div>
      <div className="music-release-ghost-meta">
        <p className="music-release-ghost-title">{releaseTitle ?? i18n['title'][lang]}</p>
      </div>
    </div>
  )
}

export default MusicReleaseGhost
