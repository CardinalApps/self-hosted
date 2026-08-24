import { useSelector } from 'react-redux'

import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import UserTag from '@cardinalapps/ui/src/components/interaction/UserTag'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import { useGetActiveUsersQuery } from '@cardinalapps/ui/src/store/apis/activeUsers'
import { formatTimeAgo } from '@cardinalapps/ui/src/lib/formatting/time'

import ReloadButton from '../../components/ReloadButton'
import i18n from './i18n.json'
import './styles.css'

function WidgetActiveUsers() {
  const { lang } = useSelector(settingsSelectors.current)
  const { data, refetch } = useGetActiveUsersQuery({})
  const activeUsers = data || []

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
        <ReloadButton title={i18n['reload-button.title'][lang]} onClick={() => refetch()} />
      }
    >
      {activeUsers.length
        ? <div className={'active-users'}>
            {activeUsers.map((user) => {
              return (
                <div key={user.userId} className={'active-user'}>
                  <UserTag user={user} size="s" />
                  <p className={'time-ago'}>{formatTimeAgo(user.activityStatusUpdatedAt, lang)}</p>
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
