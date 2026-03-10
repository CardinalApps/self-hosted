import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import ms from 'ms'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import List from '@cardinalapps/ui/src/components/interaction/List'
import H5 from '@cardinalapps/ui/src/components/typography/H5'

import homeServerAPI from '@cardinalapps/ui/src/lib/homeserver/homeServerAPI'
import { formatWithCommas } from '@cardinalapps/ui/src/lib/formatting/number'

import { indexingSelectors, indexingActions, SSEIndexingUpdate } from '@cardinalapps/ui/src/store/slices/indexing'
import { useUpdateCurrentRunStateMutation } from '@cardinalapps/ui/src/store/apis/runs'

import i18n from '../i18n.json'

function Indexer() {
  const dispatch = useDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const runStartedAt = useSelector(indexingSelectors.startedAt)
  const [startedAtCounter, setStartedAtCounter] = useState(i18n['run.status.not-started'][lang])
  const indexingServiceState = useSelector(indexingSelectors.serverState)
  const numFilesFound = useSelector(indexingSelectors.filesFound)
  const numFilesIndexed = useSelector(indexingSelectors.filesIndexed)
  const numFilesSkipped = useSelector(indexingSelectors.filesSkipped)
  const numFilesErrored = useSelector(indexingSelectors.filesErrored)
  const [updateCurrentRunState] = useUpdateCurrentRunStateMutation()

  /**
   * When the big power button is clicked.
   */
  const handleStopButtonClick = () => {
    updateCurrentRunState({ action: 'stop' })
  }

  /**
   * Fetch the current indexing state on page load.
   */
  useEffect(() => {
    homeServerAPI('/index/state')
      .then((res: SSEIndexingUpdate) => {
        dispatch(indexingActions.setServerState(res))
      })
      .catch(() => {
        console.error('Could not fetch indexing state')
      })
  }, [])

  /**
   * Format time ago.
   */
  const timeAgo = (fromMs) => {
    if (typeof fromMs === 'number') {
      return `${ms((Date.now() - fromMs), { long: true })}`
    } else {
      return i18n['run.status.not-started'][lang]
    }
  }

  /**
   * Run the real time indexing counter.
   */
  useEffect(() => {
    setStartedAtCounter(timeAgo(runStartedAt))

    const interval = setInterval(() => setStartedAtCounter(timeAgo(runStartedAt)), 1000)
    return () => clearInterval(interval)
  }, [runStartedAt])

  return (
    <CardGrid.Card
      size="s"
      header={
        <>
          <H5>{i18n['status.overall-progress.title'][lang]}</H5>
        </>
      }
    >
      <List
        className="server-info-list"
        layout="compact"
        items={[
          {
            name: i18n['status.current-status'][lang],
            label: (
              <>
                {indexingServiceState === 'idle' &&
                  <span>{i18n['state.idle'][lang]}</span>
                }
                {indexingServiceState === 'indexing' &&
                  <span>{i18n['state.indexing'][lang]}</span>
                }
                {indexingServiceState === 'paused' &&
                  <span>
                    {i18n['state.paused'][lang]}
                    <button
                      className={'stopRun'}
                      title={i18n['stop-run.title-attr'][lang]}
                      onClick={handleStopButtonClick}
                    >
                      <i className="far fa-stop-circle" />
                    </button>
                  </span>
                }
                {indexingServiceState === 'completed' && numFilesIndexed >= 1 &&
                  <span>
                    {i18n['state.completed'][lang]}
                    <i className={`fas fa-check importCompletedIcon`} />
                  </span>
                }
                {indexingServiceState === 'completed' && numFilesIndexed === 0 &&
                  <span>
                    {i18n['state.completed.no-files-found'][lang]}
                  </span>
                }
              </>
            ),
          },
          {
            name: i18n['status.elapsed'][lang],
            label: startedAtCounter,
          },
          {
            name: i18n['status.total-files-found'][lang],
            label: formatWithCommas(numFilesFound) + ' ' + i18n['files'][lang],
          },
          {
            name: i18n['status.total-files-indexed'][lang],
            label: formatWithCommas(numFilesIndexed) + ' ' + i18n['files'][lang],
          },
          {
            name: i18n['status.total-files-skipped'][lang],
            label: formatWithCommas(numFilesSkipped) + ' ' + i18n['files'][lang],
          },
          {
            name: i18n['status.total-files-errored'][lang],
            label: formatWithCommas(numFilesErrored) + ' ' + i18n['files'][lang],
          },
        ]}
      />
    </CardGrid.Card>
  )
}

export default Indexer
