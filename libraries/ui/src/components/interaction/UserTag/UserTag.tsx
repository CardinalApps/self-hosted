import Avatar, { AvatarSize } from '../../layout/Avatar/Avatar'
import { UserType } from '../../../types/user'
import { useAppSelector } from '../../../hooks/useAppSelector'
import { settingsSelectors } from '../../../store/slices/settings'

import i18n from './i18n'
import './User.css'

type UserProps = {
  user?: UserType,
  showName?: boolean,
  showAvatar?: boolean,
  size?: AvatarSize,
}

/**
 * A user component.
 */
const UserTag = ({
  user,
  showName = true,
  showAvatar = true,
  size = 'm',
}: UserProps) => {
  const { lang } = useAppSelector(settingsSelectors.current)
  return (
    <div className={`user size-${size}`}>
      {/* Guest */}
      {showAvatar && user?.designation === 'guest_account' &&
        <Avatar size={size} type="guest" className={'avatar'} />
      }

      {/* Local user with only a username */}
      {showAvatar && user?.designation !== 'guest_account' && !user.cardinalId && user?.username &&
        <Avatar
          size={size}
          className={'avatar'}
          initials={user.username.substring(0, 2).toUpperCase()}
          color={'var(--accent-color)'}
          type="color"
        />
      }

      {/* Cloud user with a cloud avatar */}
      {showAvatar && user?.designation !== 'guest_account' && user?.cachedCloudUser?.avatar &&
        <Avatar
          size={size}
          className={'avatar'}
          image={user?.cachedCloudUser?.avatar?.image}
          initials={user?.cachedCloudUser?.avatar?.initials}
          color={user?.cachedCloudUser?.avatar?.color}
          type={user?.cachedCloudUser?.avatar?.type}
        />
      }

      {/* Name for Guest */}
      {!!showName && user?.designation === 'guest_account' && (
        <p className="user-name">{i18n['user.guest'][lang]}</p>
      )}

      {/* Name for other accounts */}
      {!!showName && user?.designation !== 'guest_account' && (
        <p className="user-name">
          {
            user?.cardinalId
              ? user?.cachedCloudUser?.publicName || i18n['users.table.cloud-user.fallback-name'][lang]
              : user?.username || i18n['users.table.cloud-user.fallback-name'][lang]
          }
        </p>
      )}
    </div>
  )
}

export default UserTag
