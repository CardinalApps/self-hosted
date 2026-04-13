import { useState } from 'react'
import type { Meta } from '@storybook/react'

import Ratings from './Ratings'

const meta = {
  title: 'Interaction/Ratings',
  component: Ratings,
  argTypes: {},
} satisfies Meta<typeof Ratings>

export const Unrated = () => {
  const [rating, setRating] = useState<number | null>(null)
  return (
    <Ratings
      rating={rating}
      maxRating={5}
      onChange={setRating}
    />
  )
}

export const PartialRating = () => {
  const [rating, setRating] = useState<number | null>(0.7)
  return (
    <Ratings
      rating={rating}
      maxRating={5}
      onChange={setRating}
    />
  )
}

export const HalfStarRating = () => {
  const [rating, setRating] = useState<number | null>(0.5)
  return (
    <Ratings
      rating={rating}
      maxRating={5}
      onChange={setRating}
    />
  )
}

export const FullyRated = () => {
  const [rating, setRating] = useState<number | null>(1)
  return (
    <Ratings
      rating={rating}
      maxRating={5}
      onChange={setRating}
    />
  )
}

export const ReadOnly = () => {
  return (
    <Ratings
      rating={0.6}
      maxRating={5}
      canRate={false}
    />
  )
}

export const SingleStar = () => {
  const [rating, setRating] = useState<number | null>(null)
  return (
    <Ratings
      rating={rating}
      maxRating={1}
      onChange={setRating}
    />
  )
}

export default meta
