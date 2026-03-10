import { useSelector } from 'react-redux'
import formatDistanceToNowStrict from 'date-fns/formatDistanceToNowStrict'
import ms from 'ms'

import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import UserTag from '@cardinalapps/ui/src/components/interaction/UserTag'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import { useGetActiveUsersQuery } from '@cardinalapps/ui/src/store/apis/activeUsers'

import ReloadButton from './ReloadButton'
import i18n from './i18n.json'
import './styles.css'

function WidgetActiveUsers() {
  const { lang } = useSelector(settingsSelectors.current)
  const { data, refetch } = useGetActiveUsersQuery({})
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

  return (
    <CardGrid.Card
      size="m"
      capabilities={['Users.Read']}
      className="active-users-widget"
      icon={<Icon fa="fas fa-users" />}
      header={
        <H5>{i18n['active-users.title'][lang]}</H5>
      }
      headerRight={
        <ReloadButton onClick={() => refetch()} />
      }
    >
      {activeUsers.length
        ? <div className={'active-users'}>
            {activeUsers.map((user) => {
              return (
                <div key={user.userId} className={'active-user'}>
                  <UserTag user={user} size="s" />
                  <p className={'time-ago'}>{formatTimeAgo(user.activityStatusUpdatedAt)}</p>
                </div>
              )
            })}
          </div>
        : <p className={'noActiveUsers'}>{i18n['active-users.none'][lang]}</p>
      }
    </CardGrid.Card>
  )
}

export default WidgetActiveUsers
