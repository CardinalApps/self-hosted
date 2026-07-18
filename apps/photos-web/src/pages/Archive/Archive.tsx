import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Button from '@cardinalapps/ui/src/components/interaction/Button'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'

import NoContentMessage from '../../components/NoContentMessage'

import i18n from './i18n.json'
import './styles.css'

import { HOME_SERVER_HOST } from '../../env'

function ArchivePage() {
  return (
    <AppPage
      className={"photos-archive"}
      layout={PAGE_LAYOUT.fixed}
      pageTitle={i18n['title']['en']}
      capabilities={['Photos.Read']}
    >
      <section>
        <NoContentMessage
          showUnavailableMessage={true}
          icon={<i className="fas fa-upload" />}
          title={i18n['no-photos-card-title']['en']}
          button={
            <Button href={`${HOME_SERVER_HOST}/admin/indexing`} target="_blank" solid={true}>
              {i18n['no-photos-button']['en']}
            </Button>
          }
        >
          <p>{i18n['no-photos-card-message']['en']}</p>
        </NoContentMessage>
      </section>
    </AppPage>
  )
}

export default ArchivePage
