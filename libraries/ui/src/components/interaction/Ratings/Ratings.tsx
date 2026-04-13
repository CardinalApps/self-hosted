import { useState } from 'react'
import clsx from 'clsx'

import i18n from './i18n'

import './Ratings.css'

type RatingsProps = {
  rating?: number | null
  maxRating?: number
  canRate?: boolean
  lang?: string
  onChange?: (rating: number | null) => void
}

const Ratings = ({
  rating = null,
  maxRating = 5,
  canRate = true,
  lang = 'en',
  onChange,
}: RatingsProps) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const currentStars = rating !== null ? rating * maxRating : 0
  const displayValue = hoverValue !== null ? hoverValue : currentStars

  const getStarFill = (starIndex: number): 'full' | 'half' | 'empty' => {
    if (displayValue >= starIndex) return 'full'
    if (displayValue >= starIndex - 0.5) return 'half'
    return 'empty'
  }

  const handleClick = (value: number) => {
    if (!canRate || !onChange) return
    onChange(value === currentStars ? null : value / maxRating)
  }

  return (
    <div className="ratings" onMouseLeave={() => setHoverValue(null)}>
      {[...Array(maxRating)].map((_, i) => {
        const starIndex = i + 1
        const fill = getStarFill(starIndex)
        return (
          <div key={starIndex} className={clsx('ratings-star', `ratings-star--${fill}`)}>
            {canRate && (
              <>
                <button
                  type="button"
                  className="ratings-star-half ratings-star-left"
                  onMouseEnter={() => setHoverValue(starIndex - 0.5)}
                  onClick={() => handleClick(starIndex - 0.5)}
                  title={starIndex - 0.5 === currentStars ? i18n['rating.action.remove'][lang] : i18n['rating.action.rate'][lang]}
                />
                <button
                  type="button"
                  className="ratings-star-half ratings-star-right"
                  onMouseEnter={() => setHoverValue(starIndex)}
                  onClick={() => handleClick(starIndex)}
                  title={starIndex === currentStars ? i18n['rating.action.remove'][lang] : i18n['rating.action.rate'][lang]}
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
