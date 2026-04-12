import { useContext, useEffect } from 'react'

import { settingsSelectors } from '../../../../store/slices/settings'
import { indexingSelectors, SSEIndexingUpdate } from '../../../../store/slices/indexing'
import { homeServerSelectors } from '../../../../store/slices/homeServer'
import { useGetJobsQuery } from '../../../../store/apis/jobs'
//import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'
import { indexingActions } from '../../../../store/slices/indexing'

import { formatWithCommas } from '../../../../lib/formatting/number'
import { CardinalApp } from '../../../../lib/env/cardinal'

import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'
import useContextAwareLink from '../../../../hooks/useContextAwareLink'
import { useAppDispatch } from '../../../../hooks/useAppDispatch'
import { useAppSelector } from '../../../../hooks/useAppSelector'
import useHasCapability from '../../../../hooks/useHasCapability'

import MenuButton from '../../../interaction/MenuButton'

import i18n from '../i18n'
import globalI18n from '../../../../i18n/global'
import { RouterContext } from '../../../../context/router'

/**
 * Activity icon.
 */
const ActivityIcon = () => {
  const dispatch = useAppDispatch()
  const { Link } = useContext(RouterContext)
  const { lang, open_apps_in_new_tab } = useAppSelector(settingsSelectors.current)
  const userCanReadIndexing = useHasCapability('Indexing.Read')
  const userCanReadJobs = useHasCapability('Jobs.Read')
  const indexingServiceState = useAppSelector(indexingSelectors.serverState)
  const numFilesFound = useAppSelector(indexingSelectors.filesFound)
  const numFilesIndexed = useAppSelector(indexingSelectors.filesIndexed)
  const numFilesSkipped = useAppSelector(indexingSelectors.filesSkipped)
  const numFilesErrored = useAppSelector(indexingSelectors.filesErrored)
  const contextAwareIndexingLink = useContextAwareLink(CardinalApp.ADMIN, '/indexing')
  const contextAwareJobsLink = useContextAwareLink(CardinalApp.ADMIN, '/jobs')
  const latestEvent = useAppSelector(homeServerSelectors.latestEvent)

  const {
    data: activeJobsResponse,
    // isLoading: activeJobsLoading,
    // isError: activeJobsError,
    refetch: refetchActiveJobs,
  } = useGetJobsQuery(
    { take: 9999, skip: 0, status: ['preparing', 'paused', 'running', 'in_queue'], order: 'ASC' },
    { skip: !userCanReadJobs },
  )
  const [activeJobs] = activeJobsResponse || []

  const indexingIsActive = indexingServiceState === 'paused' || indexingServiceState === 'indexing'
  const jobIsActive = !!activeJobs?.length
  const somethingIsActive = indexingIsActive || jobIsActive

  /**
   * Refetch data when jobs trigger events on the server.
   */
  useEffect(() => {
    if (userCanReadJobs) {
      switch (latestEvent?.type) {
        case 'sse/job.preparing':
        case 'sse/job.prepared':
        case 'sse/job.started':
        case 'sse/job.resume':
        case 'sse/job.completed':
          refetchActiveJobs()
          break
      }
    }
  }, [latestEvent])

  /**
   * Fetch the current indexing state on page load.
   */
  useEffect(() => {
    homeServerAPI('/index/state')
      .then((res) => {
        dispatch(indexingActions.setServerState(res as SSEIndexingUpdate))
      })
      .catch(() => {
        console.error('Could not fetch indexing state')
      })
  }, [])

  /**
   * Create a context aware link to the indexing page.
   */
  const indexingLink = (children) => {
    if (contextAwareIndexingLink.internal) {
      return (
        <Link to={contextAwareIndexingLink.path} target={open_apps_in_new_tab ? '_blank' : '_self'}>
          {children}
        </Link>
      )
    } else {
      return (
        <a href={contextAwareIndexingLink.path} target={open_apps_in_new_tab ? '_blank' : '_self'}>
          {children}
        </a>
      )
    }
  }

  /**
   * Create a context aware link to the indexing page.
   */
  const jobsLink = (children) => {
    if (contextAwareIndexingLink.internal) {
      return (
        <Link to={contextAwareJobsLink.path} target={open_apps_in_new_tab ? '_blank' : '_self'}>
          {children}
        </Link>
      )
    } else {
      return (
        <a href={contextAwareJobsLink.path} target={open_apps_in_new_tab ? '_blank' : '_self'}>
          {children}
        </a>
      )
    }
  }

  return (
    <MenuButton
      solid={false}
      size="m"
      align={'center'}
      title={i18n['activity-icon.title'][lang]}
      icon={
        <i
          className={`fas fa-bolt`}
          style={somethingIsActive ? { color: 'var(--accent-color)', animation: 'iconPulse 3s infinite' } : {}}
        />
      }
    >
      <MenuButton.Section className="currently-active">
        {!somethingIsActive &&
          <div className="no-activity">
            {i18n['activity.none'][lang]}
          </div>
        }

        {/* Indexing activity */}
        {userCanReadIndexing && !!indexingIsActive &&
          <div className="activity">
            {indexingLink(
              <>
                <span className="name">{i18n['activity.indexing.name'][lang]}</span>
                <span className="status">{formatWithCommas(numFilesIndexed + numFilesErrored + numFilesSkipped) + '/' + formatWithCommas(numFilesFound)}</span>
              </>,
            )}
          </div>
        }

        {/* Job activity */}
        {userCanReadJobs && !!jobIsActive && activeJobs.map((job) => {
          return (
            <div key={job?.jobId} className="activity">
              {jobsLink(
                <>
                  <span className="name">{globalI18n[`job.${job?.type}.name`]?.[lang]}</span>
                  <span className="status">{globalI18n[`job.status.${job?.status}`]?.[lang]}</span>
                </>,
              )}
            </div>
          )
        })}
      </MenuButton.Section>
    </MenuButton>
  )
}

export default ActivityIcon
