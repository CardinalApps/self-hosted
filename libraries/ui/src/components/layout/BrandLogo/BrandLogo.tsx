import clsx from 'clsx'

import {
  Birb,
  CardinalMusic,
  CardinalPhotos,
  CardinalCinema,
  CardinalBooks,
  CardinalServer,
} from './icons'

import './BrandLogo.css'

export type BrandLogoIcon =
  'birb'|
  'cardinal_music'|
  'music'|
  'cardinal_photos'|
  'photos'|
  'cardinal_cinema'|
  'cinema'|
  'cardinal_books'|
  'books'|
  'admin'|
  'cardinal_server'|
  'cardinal_media_server' |
  'home_server'

type BrandLogoProps = {
  icon?: BrandLogoIcon,
  size?: 'xs' | 's' | 'm' | 'l' | 'xl',
  className?: string,
  border?: boolean,
  style?: Record<string, unknown>,
}

const BrandLogo = ({
  icon,
  size = 'm',
  className = '',
  border = false,
  style,
  ...props
}: BrandLogoProps) => {
  const getIcon = () => {
    switch (icon) {
      case 'birb':
        return Birb
      case 'cardinal_music':
      case 'music':
        return CardinalMusic
      case 'cardinal_photos':
      case 'photos':
        return CardinalPhotos
      case 'cardinal_cinema':
      case 'cinema':
        return CardinalCinema
      case 'cardinal_books':
      case 'books':
        return CardinalBooks
      case 'home_server':
      case 'cardinal_server':
      case 'cardinal_media_server':
      case 'admin':
        return CardinalServer
    }
  }

  const isSquare = () => {
    if (icon === 'birb') {
      return false
    } else {
      return true
    }
  }

  return (
    <div
      className={clsx(
        'brand-logo',
        className,
        icon,
        'size-' + size,
        isSquare() && 'square',
        border && 'border',
      )}
      style={style}
      {...props}
    >
      {getIcon()}
    </div>
  )
}

export default BrandLogo
