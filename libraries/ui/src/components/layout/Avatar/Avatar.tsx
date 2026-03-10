import clsx from 'clsx'

import Icon from '../../typography/Icon'

import './Avatar.css'

export type AvatarSize = 'xs' | 's' | 'm' | 'l' | 'xl'
export type AvatarProps = {
  type?: 'image' | 'color' | 'guest',
  image?: string,
  fa?: string,
  title?: string,
  initials?: string,
  color?: string,
  size?: AvatarSize,
  className?: string,
  style?: Record<string, unknown>,
}

const Avatar = ({
  type,
  image,
  title,
  fa,
  color,
  initials,
  size = 'm',
  className = '',
  style,
}: AvatarProps) => {
  // FIXME this should not be needed. The full URL should be provided to this component.
  const publicAvatarUrl = () => {
    return `https://account.cardinalapps.io/images/avatars/${image}`
  }

  return (
    <div
      className={clsx('user-avatar', className, 'size-' + size, type === 'guest' && 'guest')}
      style={{
        backgroundImage: type === 'image' && image ? `url(${publicAvatarUrl()})` : undefined,
        backgroundColor: type === 'color' && color ? color : undefined,
        ...style,
      }}
      title={title}
    >
      {!!fa && <Icon fa={fa} />}
      {type === 'guest' ? <Icon fa="icon fas fa-crow" hoverType={null}/> : ''}
      {initials && type === 'color' ? initials : ''}
    </div>
  )
}

export default Avatar
