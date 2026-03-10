import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import clsx from 'clsx'

import TimeCounter from '@cardinalapps/ui/src/components/typography/TimeCounter'
import ProgressBar from '@cardinalapps/ui/src/components/layout/ProgressBar'
import Button from '@cardinalapps/ui/src/components/interaction/Button'

import { jobSelectors } from '@cardinalapps/ui/src/store/slices/jobs'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'

import JobStatusComponent from '../JobStatus'

import {
  Job,
  useControlActiveJobMutation,
} from '@cardinalapps/ui/src/store/apis/jobs'

import i18n from '../../i18n.json'

import './styles.css'
import { JobStatus } from '../../Jobs'

type ActiveJobProps = {
  job: Job,
}

function ActiveJob({
  job,
}: ActiveJobProps) {
  const dispatch = useDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const activeJobProgress = useSelector(jobSelectors.activeJobProgress)
  const [controlActiveJob, controlActiveJobResult] = useControlActiveJobMutation()
  const createdAt = new Date(job.createdAt)

  const handlePause = () => {
    controlActiveJob({
      jobId: job.id,
      body: {
        status: 'paused',
      },
    })
  }

  const handleResume = () => {
    controlActiveJob({
      jobId: job.id,
      body: {
        status: 'running',
      },
    })
  }

  const handleCancel = () => {
    controlActiveJob({
      jobId: job.id,
      body: {
        status: 'canceled',
        completedAt: new Date(),
      },
    })
  }

  /**
   * Hide when the job has started successfully.
   */
  useEffect(() => {
    if (controlActiveJobResult.isSuccess) {
      console.log('todo')
    }
  }, [controlActiveJobResult.isSuccess])

  /**
   * Show an error toast if we couldn't start the job.
   */
  useEffect(() => {
    if (controlActiveJobResult.isError) {
      dispatch(toastActions.addToQueue({
        type: 'danger',
        ttl: 10000,
        title: i18n['jobs.error.could-not-update'][lang],
        // @ts-expect-error
        body: `<strong>${controlActiveJobResult?.error?.status}</strong> - ${controlActiveJobResult?.error?.data?.message}`,
        showClose: true,
      }))
    }
  }, [controlActiveJobResult.isError])

  return (
    <div className={'activeJob'}>
      <div className={'info'}>
        <p className="active-job-name">{i18n[`job.${job.type}.title`]?.[lang]}</p>
        <JobStatusComponent status={job.status as JobStatus} />
      </div>

      <div
        className={clsx('date')}
        title={createdAt.toISOString()}
      >
        <TimeCounter
          className={'date'}
          startedAt={createdAt.getTime()}
          phrase={i18n['job.started-at'][lang]}
        />
      </div>

      <div className={'progress'}>
        <div className={'progressBar'}>
          <ProgressBar
            current={activeJobProgress?.[job.id]?.completed || job?.completedTasks || 0}
            total={activeJobProgress?.[job.id]?.total || job?.totalTasks || 0}
            showCount={true}
          />
        </div>
        <div className={'controls'}>
          {/* Show cancel button when paused or not yet started */}
          {(job.status === 'paused' || job.status === 'in_queue' || job.status === 'preparing') &&
            <Button
              onClick={handleCancel}
              animation={controlActiveJobResult.isLoading ? 'loading' : undefined}
            >
              {i18n[`job.button.cancel`][lang]}
            </Button>
          }

          {/* Show resume button when paused */}
          {job.status === 'paused' &&
            <Button
              onClick={handleResume}
            >
              {i18n[`job.button.resume`][lang]}
            </Button>
          }

          {/* Show pause button when running */}
          {job.status === 'running' &&
            <Button
              onClick={handlePause}
            >
              {i18n[`job.button.pause`][lang]}
            </Button>
          }
        </div>
      </div>
    </div>
  )
}

export default ActiveJob
