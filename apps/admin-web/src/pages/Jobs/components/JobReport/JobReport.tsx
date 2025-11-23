import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'

import H5 from '@cardinalapps/ui/src/components/typography/H5'
import TimeCounter from '@cardinalapps/ui/src/components/typography/TimeCounter'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Drawer from '@cardinalapps/ui/src/components/layout/Drawer'
import Table from '@cardinalapps/ui/src/components/interaction/Table'
import { Job } from '@cardinalapps/ui/src/store/apis/jobs'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import homeServerAPI from '@cardinalapps/ui/src/lib/homeserver/homeServerAPI'

import { useLazyGetJobTasksQuery } from '@cardinalapps/ui/src/store/apis/jobTasks'

import JobStatus from '../JobStatus'

import i18n from '../../i18n.json'

import './styles.css'

const JOB_TASKS_PER_PAGE = 10

type JobReportProps = {
  job: Job,
}

function JobReport({
  job,
}: JobReportProps) {
  const { lang } = useSelector(settingsSelectors.current)
  const [showDetails, setShowDetails] = useState(false)
  const date = new Date(job.completedAt)
  const [jobDetails, setJobDetails] = useState<Job>()
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false)
  const [jobTasksPage, setJobTasksPage] = useState(1)

  const [fetchJobTasks, fetchJobTasksResult] = useLazyGetJobTasksQuery()
  const {
    data: jobTasksData,
    isLoading: jobTasksLoading,
  } = fetchJobTasksResult
  const [jobTasks, totalJobTasks] = jobTasksData || []

  /**
   * Fetch job on open.
   */
  useEffect(() => {
    if (showDetails) {
      setJobDetailsLoading(true)
      homeServerAPI(`/job/${job.id}`)
        .then((res: Job) => {
          setJobDetails(res)
          setJobDetailsLoading(false)
          fetchJobTasks({ jobId: job.id, take: JOB_TASKS_PER_PAGE, skip: 0 })
        })
        .catch((error) => {
          console.error(error)
        })
    }
  }, [showDetails])

  /**
   * Fetch job tasks on drawer open.
   */
  useEffect(() => {
    if (showDetails) {
      fetchJobTasks({ jobId: job.id, take: JOB_TASKS_PER_PAGE, skip: JOB_TASKS_PER_PAGE * (jobTasksPage - 1) })
    }
  }, [jobTasksPage, showDetails])

  return (
    <div className={'jobReport'}>
      <header>
        <JobStatus status={job.status} />
        {!!job.completedAt &&
          <TimeCounter
            className={date.toString()}
            title={`${date.toDateString()} ${date.toLocaleTimeString()}`}
            startedAt={date.getTime()}
            phrase={i18n['job.completed-at'][lang]}
          />
        }
      </header>
      <div className={'row'}>
        <H5 className={'title'}>{i18n[`job.${job.type}.title`]?.[lang]}</H5>
        <div className={'controls'}>
          <Button
            onClick={() => setShowDetails(true)}
          >
            {i18n[`job.button.view-details`]?.[lang]}
          </Button>
        </div>
      </div>
      {!!showDetails &&
        <Drawer
          width={500}
          title={i18n['job.details.title'][lang]}
          loading={!!jobDetailsLoading}
          onClose={() => setShowDetails(false)}
        >
          <div className={'details'}>
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
    </div>
  )
}

export default JobReport
