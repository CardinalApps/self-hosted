import { useState } from 'react'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import clsx from 'clsx'

import AppPage from '@cardinalapps/ui/src/components/features/AppBase/AppPage'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import StartJob from './components/StartJob'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import { PAGE_LAYOUT } from '@cardinalapps/ui/src/store/slices/layout'
import Active from './cards/Active'
import History from './cards/History'
import Toolbar from '@cardinalapps/ui/src/components/interaction/Toolbar'
import { ToolbarItem } from '@cardinalapps/ui/src/components/interaction/Toolbar/types'

import { useGetJobTypesQuery, useGetJobsQuery } from '@cardinalapps/ui/src/store/apis/jobs'

import i18n from './i18n.json'
import './styles.css'

export type JobStatus = 'in_queue' | 'preparing' | 'running' | 'paused' | 'canceled' | 'completed' | 'errored'

// export type JobReport = {
//   status: JobStatus,
// }

const TOOLBAR_NAME = 'admin-jobs'

function Jobs() {
  const { lang } = useSelector(settingsSelectors.current)
  const [jobToStart, setJobToStart] = useState()

  const {
    data: jobTypes,
  } = useGetJobTypesQuery()

  const {
    refetch: refetchActiveJobs,
  } = useGetJobsQuery({ take: 9999, skip: 0, status: ['preparing', 'paused', 'running', 'in_queue'], order: 'ASC' })

  const handleJobTypeClick = (job) => {
    if (jobToStart === job) {
      setJobToStart(undefined)
    } else {
      setJobToStart(job)
    }
  }

  const newJobVariants = {
    initial: {
      y: -20,
      height: 0,
      opacity: 0,
    },
    open: {
      y: 0,
      height: 'auto',
      opacity: 1,
      transition: {
        opacity: {
          delay: 0.2,
        },
        y: {
          type: 'spring',
        },
      },
    },
    exit: {
      y: 0,
      height: 0,
      opacity: 0,
    },
  }

  return (
    <AppPage
      layout={PAGE_LAYOUT.standard}
      pageTitle={i18n['title'][lang]}
      capabilities={['Jobs.Read']}
      toolbar={(
        <Toolbar
          name={TOOLBAR_NAME}
          items={[
            [
              {
                slug: ToolbarItem.BREADCRUMBS,
                render: ToolbarItem.BREADCRUMBS,
              },
            ],
          ]}
        />
      )}
    >
      <div className={'jobTags'}>
        {!!jobTypes?.length && jobTypes.map((job) => {
          const configuring = jobToStart === job
          return (
            <button
              key={job}
              className={clsx('jobTag', configuring && 'configuring')}
              onClick={() => handleJobTypeClick(job)}
            >
              {configuring
                ? <i className="fas fa-minus-circle" />
                : <i className="fas fa-plus-circle" />
              }
              <span>{i18n[`job.${job}.name`]?.['en'] || job}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {!!jobToStart &&
          <motion.div
            initial="initial"
            animate="open"
            exit="exit"
            variants={newJobVariants as Variants}
          >
            <StartJob
              jobType={jobToStart}
              refetchActiveJobs={refetchActiveJobs}
              close={() => setJobToStart(undefined)}
            />
          </motion.div>
        }
      </AnimatePresence>

      <CardGrid rowHeight='l'>
        <Active />
        <History />
      </CardGrid>
    </AppPage>
  )
}

export default Jobs
