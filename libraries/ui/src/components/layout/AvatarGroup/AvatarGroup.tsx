import Avatar from '../Avatar'

import './AvatarGroup.css'

type AvatarGroupProps = {
  avatars?: Record<string, unknown>[],
}

const AvatarGroup = ({
  avatars = [],
}: AvatarGroupProps) => {

  return (
    <div
      className={`avatar-group`}
    >
      {avatars.map((props, i) => <Avatar key={i} {...props} />)}
    </div>
  )
}

export default AvatarGroup
