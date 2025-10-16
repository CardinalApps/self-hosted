import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import formatDistanceToNowStrict from 'date-fns/formatDistanceToNowStrict'
import ms from 'ms'

import Loading from '@cardinalapps/ui/src/components/layout/Loading'
import Avatar from '@cardinalapps/ui/src/components/layout/Avatar'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import { useGetActiveUsersQuery } from '@cardinalapps/ui/src/store/apis/activeUsers'

import i18n from './i18n.json'
import './styles.css'

type ActiveUsersProps = {
  reload?: number
}

function ActiveUsers({ reload }: ActiveUsersProps) {
  const { lang } = useSelector(settingsSelectors.current)
  const { data, isFetching, refetch } = useGetActiveUsersQuery({})
  const activeUsers = data || []

  const formatTimeAgo = (timeString) => {
    const date = new Date(timeString)
    const msAgo = Date.now() - date.getTime()

    if (msAgo < ms('1 minute')) {
      return i18n['active-users.less-than-a-minute-ago'][lang]
    } else {
      return `${formatDistanceToNowStrict(new Date(timeString))} ${i18n['active-users.ago'][lang]}`
    }
  }

  useEffect(() => {
    refetch()
  }, [reload])

  return (
    <>
      {isFetching
        ? <Loading className={'loading'} />
        : <div>
            {activeUsers.length
              ? <div className={'activeUsers'}>
                  {activeUsers.map((user) => {
                    return (
                      <div key={user.userId} className={'activeUser'}>
                        {user.cachedCloudUser?.avatar
                          ? <Avatar {...user.cachedCloudUser.avatar} className={'avatar'} size="l" />
                          : <Avatar size="l" type="guest" className={'avatar'} />
                        }
                        <p className={'timeAgo'}>{formatTimeAgo(user.activityStatusUpdatedAt)}</p>
                        {user.designation === 'guest_account'
                          ? <p className={'name'}>{i18n['active-users.guest-account'][lang]}</p>
                          : <p className={'name'}>{!!user.cachedCloudUser?.publicName && user.cachedCloudUser?.publicName || 'Cardinal User'}</p>
                        }
                      </div>
                    )
                  })}
                </div>
              : <p className={'noActiveUsers'}>{i18n['active-users.none'][lang]}</p>
            }
          </div>
      }
    </>
  )
}

export default ActiveUsers
