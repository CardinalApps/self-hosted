import { useState } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import { settingsSelectors } from '../../../store/slices/settings'

import './Ratings.css'

type RatingsProps = {
  rating?: number | null
  maxRating?: number
  canRate?: boolean
  onChange?: (rating: number | null) => void
}

const Ratings = ({
  rating = null,
  maxRating = 5,
  canRate = true,
  onChange,
}: RatingsProps) => {
  const { enable_half_ratings } = useSelector(settingsSelectors.current)
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const currentStars = rating !== null ? rating * maxRating : 0
  // Round up to the nearest 0.5 so that any non-zero rating is always represented
  // visually, regardless of max_rating. e.g. a 1/5 rating with max_rating=1 shows
  // as a half star rather than nothing.
  // Special case: with a single star, only show full if rating is exactly 100%.
  // Any lesser rating rounds down to a half-star rather than up to a full star.
  const displayCurrentStars = rating !== null
    ? maxRating === 1
      ? rating === 1 ? 1 : 0.5
      : Math.ceil(currentStars * 2) / 2
    : 0
  const displayValue = hoverValue !== null ? hoverValue : displayCurrentStars

  const getStarFill = (starIndex: number): 'full' | 'half' | 'empty' => {
    if (displayValue >= starIndex) return 'full'
    if (displayValue >= starIndex - 0.5) return 'half'
    return 'empty'
  }

  const handleClick = (value: number) => {
    if (!canRate || !onChange) return
    onChange(value === currentStars ? null : value / maxRating)
  }

  const ratingTitle = rating !== null ? `${Math.round(rating * 100)}%` : undefined

  return (
    <div className="ratings" onMouseLeave={() => setHoverValue(null)}>
      {[...Array(maxRating)].map((_, i) => {
        const starIndex = i + 1
        const fill = getStarFill(starIndex)
        return (
          <div key={starIndex} className={clsx('ratings-star', `ratings-star--${fill}`)}>
            {canRate && (
              <>
                {enable_half_ratings && (
                  <button
                    type="button"
                    className="ratings-star-half ratings-star-left"
                    onMouseEnter={() => setHoverValue(starIndex - 0.5)}
                    onClick={() => handleClick(starIndex - 0.5)}
                    title={ratingTitle}
                  />
                )}
                <button
                  type="button"
                  className={clsx('ratings-star-half', enable_half_ratings ? 'ratings-star-right' : 'ratings-star-full')}
                  onMouseEnter={() => setHoverValue(starIndex)}
                  onClick={() => handleClick(starIndex)}
                  title={ratingTitle}
                />
              </>
            )}
            <i className="fa-icon fas fa-star" />
          </div>
        )
      })}
    </div>
  )
}

export default Ratings
