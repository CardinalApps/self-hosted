import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Button from '@cardinalapps/ui/src/components/interaction/Button'

import NoContentMessage from '../../components/NoContentMessage'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'

import i18n from './i18n.json'
import './styles.css'

import { HOME_SERVER_HOST } from '../../env'

function PeoplePage() {
  return (
    <AppPage
      layout={PAGE_LAYOUT.standard}
      pageTitle={i18n['title']['en']}
      capabilities={['PhotoFaces.Read']}
    >
      <section>
        <NoContentMessage
          showUnavailableMessage={true}
          icon={<i className="fas fa-upload" />}
          title={i18n['no-people-card-title']['en']}
          button={
            <Button href={`${HOME_SERVER_HOST}/admin/media`} target="_blank" solid={true}>
              {i18n['no-people-button']['en']}
            </Button>
          }
        >
          <p>{i18n['no-people-card-message']['en']}</p>
        </NoContentMessage>
      </section>
    </AppPage>
  )
}

export default PeoplePage
