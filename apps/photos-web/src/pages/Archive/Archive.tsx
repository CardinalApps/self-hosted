import clsx from 'clsx'
import ms from 'ms'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Loading from '@cardinalapps/ui/src/components/layout/Loading'

import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout/constants'

import VirtualPhotoList from '../../components/VirtualPhotoList'
import NoContentMessage from '../../components/NoContentMessage'

import { queryParams } from '@cardinalapps/ui/src/lib/net/queryParams'

import i18n from './i18n.json'
import './styles.css'

import useLargeData from '../../hooks/useLargeData'

import { HOME_SERVER_HOST } from '../../env'

const defaults = {
  take: 1000000,
  skip: 0,
  order: 'desc',
  daterange: {
    start: new Date(Date.now() - ms('2.9 years')),
    end: new Date(),
  },
}

/**
 * The archive page fetches photos manually instead of using RTK Query because
 * the data is too large to be stored in localstorage.
 */
function ArchivePage() {
  const { data, isLoading } = useLargeData([], queryParams(`/photos`, {
    thumbnails: true,
    metadata: false,
    order: defaults.order,
    take: defaults.take,
    skip: defaults.skip,
  }),
  {
    expiration: ms('8 seconds'),
  })

  return (
    <AppPage
      className={"photos-archive"}
      layout={PAGE_LAYOUT.fixed}
      pageTitle={i18n['title']['en']}
      capabilities={['Photos.Read']}
    >
      <div
        className={clsx(
          'photosArchive',
          isLoading ? 'loading' : null,
        )}
      >
        {isLoading
          ? <Loading className="loading" />
          : data?.length
            ? <div className="infinitePhotos">
                <VirtualPhotoList data={data} />
              </div>
            : <NoContentMessage
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
        }
      </div>
    </AppPage>
  )
}

export default ArchivePage
