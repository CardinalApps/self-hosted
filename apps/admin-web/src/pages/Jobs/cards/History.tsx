import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import H5 from '@cardinalapps/ui/src/components/typography/H5'
import Drawer from '@cardinalapps/ui/src/components/layout/Drawer'
import Table from '@cardinalapps/ui/src/components/interaction/Table'
import List from '@cardinalapps/ui/src/components/interaction/List'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { homeServerSelectors } from '@cardinalapps/ui/src/store/slices/homeServer'
import homeServerAPI from '@cardinalapps/ui/src/lib/homeserver/homeServerAPI'
import { ListItem } from '@cardinalapps/ui/src/components/interaction/List/List'

import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'

import { jobActions } from '@cardinalapps/ui/src/store/slices/jobs'

import { Job, useGetJobsQuery } from '@cardinalapps/ui/src/store/apis/jobs'
import { useLazyGetJobTasksQuery } from '@cardinalapps/ui/src/store/apis/jobTasks'
import { formatTimeAgo } from '@cardinalapps/ui/src/lib/formatting/time'

import i18n from '../i18n.json'
import Button from '@cardinalapps/ui/src/components/interaction/Button'

const JOB_TASKS_PER_PAGE = 10

function History() {
  const dispatch = useDispatch()
  const itemsPerPage = 10
  const initialTake = 6
  const [take, setTake] = useState(initialTake)
  const { lang } = useSelector(settingsSelectors.current)
  const latestEvent = useSelector(homeServerSelectors.latestEvent)
  const [detailsId, setDetailsId] = useState<number>()
  const [jobDetails, setJobDetails] = useState<Job>()
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false)
  const [jobTasksPage, setJobTasksPage] = useState(1)

  const {
    data: activeJobsResponse,
    refetch: refetchActiveJobs,
  } = useGetJobsQuery({ take: 9999, skip: 0, status: ['preparing', 'paused', 'running', 'in_queue'], order: 'ASC' })
  const [activeJobs] = activeJobsResponse || []

  const {
    data: jobReportsResponse,
    isLoading: jobReportsLoading,
    refetch: refetchJobReports,
  } = useGetJobsQuery({ take, skip: 0, status: ['canceled', 'completed', 'errored'], order: 'DESC' })
  const [jobReports, totalJobReports] = jobReportsResponse || []

  const [fetchJobTasks, fetchJobTasksResult] = useLazyGetJobTasksQuery()
  const {
    data: jobTasksData,
    isLoading: jobTasksLoading,
  } = fetchJobTasksResult
  const [jobTasks, totalJobTasks] = jobTasksData || []

  const listItems = (): ListItem[] => {
    if (!jobReports?.length) {
      return []
    }
    return jobReports.map((job: Job) => {
      return {
        name: (
          <>
            {i18n[`job.${job.type}.title`]?.[lang]}
          </>
        ),
        icon: { fa: 'fas fa-check', className: 'success-color' },
        label: formatTimeAgo(job?.createdAt),
        controls: ['view'],
        onView: () => setDetailsId(job.id),
      } as ListItem
    })
  }

  const handleLoadMore = () => {
    if (take === initialTake) {
      setTake(itemsPerPage)
    } else {
      setTake(take + itemsPerPage)
    }
  }

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
        refetchJobReports()
        break
    }
  }, [latestEvent])

  /**
   * Fetch job on open.
   */
  useEffect(() => {
    if (detailsId) {
      setJobDetailsLoading(true)
      homeServerAPI(`/job/${detailsId}`)
        .then((res: Job) => {
          setJobDetails(res)
          setJobDetailsLoading(false)
          fetchJobTasks({ jobId: res.id, take: JOB_TASKS_PER_PAGE, skip: 0 })
        })
        .catch((error) => {
          console.error(error)
        })
    }
  }, [detailsId])

  return (
    <CardGrid.Card
      size="l"
      className={'jobReports'}
      header={<H5 className={'title'}>{i18n['job-reports.title'][lang]}</H5>}
    >
      <List
        layout="compact"
        items={listItems()}
      />
      {jobReports?.length
        ? <div className={'runsArchive'}>
            {jobReports.length < totalJobReports &&
              <div className={'loadMore'}>
                <Button onClick={handleLoadMore} animation={jobReportsLoading ? 'loading' : undefined}>
                  {i18n['job.history.load-more'][lang]}
                </Button>
              </div>
            }
          </div>
        : null
      }
      {!!detailsId &&
        <Drawer
          width={500}
          title={i18n['job.details.title'][lang]}
          loading={!!jobDetailsLoading}
          onClose={() => setDetailsId(undefined)}
        >
          <div className={'job-details'}>
            {!!jobDetails &&
              <>
                <ul className={'jobMetadata'}>
                  <li>
                    <strong>
                      {i18n['job.details.metadata.id'][lang]}
                    </strong>
                    {jobDetails?.id}
                  </li>
                  <li>
                    <strong>
                      {i18n['job.details.metadata.started-at'][lang]}
                    </strong>
                    {jobDetails?.createdAt
                      ? new Date(jobDetails.createdAt).toDateString() + ' @ ' + new Date(jobDetails.createdAt).toLocaleTimeString()
                      : 'undefined'
                    }
                  </li>
                  <li>
                    <strong>
                      {i18n['job.details.metadata.type'][lang]}
                    </strong>
                    {jobDetails?.type}
                  </li>
                  <li>
                    <strong>
                      {i18n['job.details.metadata.status'][lang]}
                    </strong>
                    {jobDetails?.status}
                  </li>
                </ul>
                <div className={'jobTasksTableHeader'}>
                  <H5>{i18n['job.details.tasks.title'][lang]}</H5>
                  <span className={'count'}>{i18n['job.details.tasks.count'][lang].replace('{num}', totalJobTasks)}</span>
                </div>
                {jobTasks?.length
                  ? <>
                      <Table
                        header={[
                          <Table.Col key="id">{i18n['job.details.tasks.id'][lang]}</Table.Col>,
                          <Table.Col key="type">{i18n['job.details.tasks.type'][lang]}</Table.Col>,
                          <Table.Col key="status">{i18n['job.details.tasks.status'][lang]}</Table.Col>,
                        ]}
                        body={jobTasks.map((task) => {
                          return [
                            <Table.Col key="id">{task.id}</Table.Col>,
                            <Table.Col key="type">{task.type}</Table.Col>,
                            <Table.Col key="status">{task.status}</Table.Col>,
                          ]
                        })}
                        page={jobTasksPage}
                        maxPages={Math.ceil((totalJobTasks / JOB_TASKS_PER_PAGE) || 1)}
                        onPageChange={(newPage) => setJobTasksPage(newPage)}
                        loading={jobTasksLoading}
                      />
                    </>
                  : <>
                      {(jobDetails.status === 'canceled') && <p className={'noJobTasks'}>{i18n['job.details.tasks.no-tasks-created'][lang]}</p>}
                      {(jobDetails.status === 'completed') && <p className={'noJobTasks'}>{i18n['job.details.tasks.no-tasks-needed'][lang]}</p>}
                    </>
                }
              </>
            }
          </div>
        </Drawer>
      }
    </CardGrid.Card>
  )
}

export default History
