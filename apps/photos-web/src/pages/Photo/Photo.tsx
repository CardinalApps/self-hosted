import { Link } from 'react-router-dom'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'

import NoContentMessage from '../../components/NoContentMessage'

import * as routes from '../../routes'

import i18n from './i18n.json'
import './styles.css'

export default function Photo() {
  return (
    <AppPage capabilities={['Photos.Read']}>
      <section>
        <NoContentMessage
          showUnavailableMessage={true}
          icon={<Icon fa="fas fa-image" />}
          title={i18n['no-photo-card-title']['en']}
          button={
            <Link to={routes.ROOT} className="button solid">
              {i18n['no-photo-button']['en']}
            </Link>
          }
        >
          <p>{i18n['no-photo-card-message']['en']}</p>
        </NoContentMessage>
      </section>
    </AppPage>
  )
}
