import { useContext, type ReactNode } from 'react'
import clsx from 'clsx'

import { RouterContext } from '../../../context/router'

import './Spotlight.css'

type SpotlightProps = {
  /** Small label above the title, e.g. "Artist Spotlight". */
  kicker: string,
  /** The day the pick was made, shown beside the kicker. */
  date?: string,
  /** The name of the spotlighted media. */
  title?: string,
  /** Route to the spotlighted media's own page. */
  titleLink?: string,
  /** One friendly sentence explaining why this pick was made. */
  reason?: string,
  /** Hero image URL. */
  image?: string,
  /** Accent color sampled from the hero image. */
  imageColor?: string | null,
  /** A row of short facts about the pick. */
  stats?: ReactNode,
  /** Action buttons. */
  actions?: ReactNode,
}

/**
 * The Spotlight hero: one personal pick presented large, with the reason it
 * was picked. Purely presentational; each app decides what to spotlight, why,
 * and what the actions do.
 */
const Spotlight = ({
  kicker,
  date,
  title,
  titleLink,
  reason,
  image,
  imageColor,
  stats,
  actions,
}: SpotlightProps) => {
  const { Link } = useContext(RouterContext)

  const heading = titleLink && Link
    ? <Link className="spotlight-title" to={titleLink}>{title}</Link>
    : <span className="spotlight-title">{title}</span>

  return (
    <div className={clsx('spotlight', image && 'has-image')}>
      {!!image && (
        <div
          className="spotlight-image"
          style={{ backgroundImage: `url('${image}')` }}
        />
      )}
      {!!imageColor && (
        <div className="spotlight-tint" style={{ backgroundColor: imageColor }} />
      )}
      <div className="spotlight-content">
        <div className="spotlight-top">
          <p className="spotlight-kicker">
            {kicker}
            {!!date && <span className="spotlight-kicker-date"> - {date}</span>}
          </p>
          {!!reason && <p className="spotlight-reason">{reason}</p>}
        </div>
        <div className="spotlight-bottom">
          {heading}
          <div className="spotlight-bottom-row">
            {!!stats && <div className="spotlight-stats">{stats}</div>}
            {!!actions && <div className="spotlight-actions">{actions}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Spotlight
