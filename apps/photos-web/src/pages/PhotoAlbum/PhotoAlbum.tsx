import { Link } from 'react-router-dom'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'

import NoContentMessage from '../../components/NoContentMessage'

import i18n from './i18n.json'

import * as routes from '../../routes'

import './styles.css'

function PhotoAlbumPage() {
  return (
    <AppPage
      restoreScrollPoint={false}
      capabilities={['Photos.Read']}
    >
      <section>
        <NoContentMessage
          showUnavailableMessage={true}
          icon={<Icon fa="fas fa-photo-video" />}
          title={i18n['no-content-message.title']['en']}
          button={
            <Link to={routes.ROOT} className="button solid">
              {i18n['no-content-message.button']['en']}
            </Link>
          }
        >
          <p>{i18n['no-content-message.desc']['en']}</p>
        </NoContentMessage>
      </section>
    </AppPage>
  )
}

export default PhotoAlbumPage
