import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import Loading from '@cardinalapps/ui/src/components/layout/Loading'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { homeServerSelectors } from '@cardinalapps/ui/src/store/slices/homeServer'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import H5 from '@cardinalapps/ui/src/components/typography/H5'

import ActiveJob from '../components/ActiveJob'

import { jobActions } from '@cardinalapps/ui/src/store/slices/jobs'

import { useGetJobsQuery } from '@cardinalapps/ui/src/store/apis/jobs'

import i18n from '../i18n.json'

export type JobStatus = 'in_queue' | 'preparing' | 'running' | 'paused' | 'canceled' | 'completed' | 'errored'

function ActiveJobs() {
  const dispatch = useDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const latestEvent = useSelector(homeServerSelectors.latestEvent)

  const {
    data: activeJobsResponse,
    isLoading: activeJobsLoading,
    refetch: refetchActiveJobs,
  } = useGetJobsQuery({ take: 9999, skip: 0, status: ['preparing', 'paused', 'running', 'in_queue'], order: 'ASC' })
  const [activeJobs] = activeJobsResponse || []

  /**
   * Clear stale cached job progress when we know of new active jobs.
   */
  useEffect(() => {
    if (activeJobs?.length) {
      dispatch(jobActions.clearActiveJobProgress({
        except: activeJobs,
      }))
    }
  }, [activeJobs])

  /**
   * Refetch data when jobs trigger events on the server.
   */
  useEffect(() => {
    switch (latestEvent?.type) {
      case 'sse/job.preparing':
      case 'sse/job.prepared':
      case 'sse/job.started':
        refetchActiveJobs()
        break

      case 'sse/job.completed':
        refetchActiveJobs()
        break
    }
  }, [latestEvent])

  return (
    <CardGrid.Card
      size="xl"
      header={<H5 className={'title'}>{i18n['active-jobs.title'][lang]}</H5>}
      footer={i18n['active-jobs.active-jobs-automatic-notice'][lang]}
      className={'jobQueue'}
    >
      {!!activeJobsLoading && <div className={'loading'}><Loading /></div>}
      {!activeJobsLoading && !!activeJobs?.length
        ?
        activeJobs.map((job) => {
          return (
            <ActiveJob
              key={job.jobId}
              job={job}
            />
          )
        })
        : <p className="card-empty-text">{i18n['active-jobs.no-active-jobs'][lang]}</p>
      }
    </CardGrid.Card>
  )
}

export default ActiveJobs
