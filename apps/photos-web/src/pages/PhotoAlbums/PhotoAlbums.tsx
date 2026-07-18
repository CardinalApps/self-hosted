import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'

import NoContentMessage from '../../components/NoContentMessage'

import i18n from './i18n.json'
import './styles.css'

import { HOME_SERVER_HOST } from '../../env'

function PhotoAlbumsPage() {
  return (
    <AppPage
      layout={PAGE_LAYOUT.standard}
      pageTitle={i18n['title']['en']}
      capabilities={['PhotoAlbums.Read', 'Photos.Read']}
    >
      <section>
        <NoContentMessage
          showUnavailableMessage={true}
          icon={<Icon fa="fas fa-upload" />}
          title={i18n['no-albums-card-title']['en']}
          button={
            <Button href={`${HOME_SERVER_HOST}/admin/media`} target="_blank" solid={true}>
              {i18n['no-albums-button']['en']}
            </Button>
          }
        >
          <p>{i18n['no-albums-card-message']['en']}</p>
        </NoContentMessage>
      </section>
    </AppPage>
  )
}

export default PhotoAlbumsPage
