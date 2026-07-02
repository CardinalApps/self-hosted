import { useSelector } from 'react-redux'

import Loading from '@cardinalapps/ui/src/components/layout/Loading'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { JobStatus as JobStatusType } from '@cardinalapps/ui/src/store/apis/jobs'

import i18n from '../../i18n.json'

import './styles.css'

export type JobStatusProps = {
  status: JobStatusType,
}

function JobStatus({
  status,
}: JobStatusProps) {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <div className={'jobStatus'}>
      {status === 'in_queue' &&
        <>
          <Icon fa="fas fa-hourglass-half" />
          <p className={'label'}>{i18n[`job.status.${status}`]?.[lang]}</p>
        </>
      }
      {status === 'preparing' &&
        <>
          <Loading size="xs" />
          <p className={'label'}>{i18n[`job.status.${status}`]?.[lang]}</p>
        </>
      }
      {status === 'running' &&
        <>
          <Loading size="xs" />
          <p className={'label'}>{i18n[`job.status.${status}`]?.[lang]}</p>
        </>
      }
      {status === 'paused' &&
        <>
          <Icon fa="fas fa-pause" />
          <p className={'label'}>{i18n[`job.status.${status}`]?.[lang]}</p>
        </>
      }
      {status === 'canceled' &&
        <>
          <Icon fa="fas fa-times" />
          <p className={'label'}>{i18n[`job.status.${status}`]?.[lang]}</p>
        </>
      }
      {status === 'completed' &&
        <>
          <Icon fa="fas fa-check" />
          <p className={'label'}>{i18n[`job.status.${status}`]?.[lang]}</p>
        </>
      }
      {status === 'errored' &&
        <>
          <Icon fa="fas fa-exclamation-circle" />
          <p className={'label'}>{i18n[`job.status.${status}`]?.[lang]}</p>
        </>
      }
    </div>
  )
}

export default JobStatus
