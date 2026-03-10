import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Button from '@cardinalapps/ui/src/components/interaction/Button'

import NoContentMessage from '../../components/NoContentMessage'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'

import i18n from './i18n.json'
import './styles.css'

import { HOME_SERVER_HOST } from '../../env'

function WatchNow() {
  return (
    <AppPage
      layout={PAGE_LAYOUT.fixed}
      pageTitle={i18n['title']['en']}
      capabilities={['TVEpisodes.Read']}
    >
      <NoContentMessage
        showUnavailableMessage={true}
        icon={<i className="fas fa-upload" />}
        title={i18n['no-movies-tv-card-title']['en']}
        button={
          <Button href={`${HOME_SERVER_HOST}/admin/media`} target="_blank" solid={true}>
            {i18n['no-movies-tv-button']['en']}
          </Button>
        }
      >
        <p>{i18n['no-movies-tv-card-message']['en']}</p>
      </NoContentMessage>
    </AppPage>
  )
}

export default WatchNow
