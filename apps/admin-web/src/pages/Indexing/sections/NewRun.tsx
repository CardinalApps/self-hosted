import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import clsx from 'clsx'

import H5 from '@cardinalapps/ui/src/components/typography/H5'
import Loading from '@cardinalapps/ui/src/components/layout/Loading'
import ToggleSwitch from '@cardinalapps/ui/src/components/forms/ToggleSwitch'
import Select from '@cardinalapps/ui/src/components/forms/Select'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'

import homeServerAPI from '@cardinalapps/ui/src/lib/homeserver/homeServerAPI'

import { indexingSelectors, indexingActions, SSEIndexingUpdate } from '@cardinalapps/ui/src/store/slices/indexing'

import { useCreateRunMutation, useUpdateCurrentRunStateMutation } from '@cardinalapps/ui/src/store/apis/runs'

import i18n from '../i18n.json'

function Indexer() {
  const dispatch = useDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const indexingServiceState = useSelector(indexingSelectors.serverState)
  const [runType, setRunType] = useState<'quick' | 'full'>('quick')
  const [indexMusic, setIndexMusic] = useState(true)
  const [indexPhotos, setIndexPhotos] = useState(true)
  const [indexMovies, setIndexMovies] = useState(false)
  const [indexTV, setIndexTV] = useState(false)
  const [createRun, createRunResult] = useCreateRunMutation()
  const [updateCurrentRunState, updateCurrentRunStateResult] = useUpdateCurrentRunStateMutation()

  /**
   * When the big power button is clicked.
   */
  const handlePowerButtonClick = () => {
    if (indexingServiceState === 'idle' || indexingServiceState === 'completed') {
      createRun({
        type: runType,
        indexMusic,
        indexPhotos,
        indexMovies,
        indexTV,
      })
    } else if (indexingServiceState === 'indexing') {
      updateCurrentRunState({ action: 'pause' })
        .then(() => {
          //console.log('after pause')
        })
    } else if (indexingServiceState === 'paused') {
      updateCurrentRunState({ action: 'resume' })
    }
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
   * Handle the createRun query.
   */
  useEffect(() => {
    if (createRunResult.isError) {
      dispatch(toastActions.addToQueue({
        type: 'danger',
        ttl: 10000,
        title: i18n['run.error.cannot-start'][lang],
        showClose: true,
      }))
    }
    if (updateCurrentRunStateResult.isError) {
      dispatch(toastActions.addToQueue({
        type: 'danger',
        ttl: 10000,
        title: i18n['run.error.general-error'][lang],
        showClose: true,
      }))
    }
  }, [createRunResult.status, updateCurrentRunStateResult.status])

  return (
    <CardGrid.Card
      size="s"
      className={'importerCard'}
    >
      <div className={'importerButton'}>
        <div className={'buttonBox'}>
          <button
            type="button"
            className={clsx(
              'importButton',
              indexingServiceState === 'indexing' ? 'running' : '',
              indexingServiceState === 'paused' ? 'paused' : '',
            )}
            onClick={handlePowerButtonClick}
          >
            <i className="fas fa-power-off" />
          </button>
          <Loading className={'spinny'} speed={'1.4'} />
        </div>
      </div>
      <div className={'controlLabel'}>
        {indexingServiceState === 'idle' && <H5 className={'title'}>{i18n['status.title.begin'][lang]}</H5>}
        {indexingServiceState === 'indexing' && <H5 className={'title'}>{i18n['status.title.pause'][lang]}</H5>}
        {indexingServiceState === 'paused' && <H5 className={'title'}>{i18n['status.title.resume'][lang]}</H5>}
        {indexingServiceState === 'completed' && <H5 className={'title'}>{i18n['status.title.begin'][lang]}</H5>}
      </div>
      <div className={'info'}>
        <div className={'indexingRow'}>
          <strong>{i18n['options.run-type'][lang]}</strong>
          <span className="run-control">
            <Select
              name="run_type"
              value={runType}
              multi={false}
              size="s"
              onChange={(val) => setRunType(val)}
              options={[
                { value: 'quick', label: i18n['options.run-type.quick'][lang] },
                { value: 'full', label: i18n['options.run-type.full'][lang] },
              ]}
            />
          </span>
        </div>
        <div className={'indexingRow'}>
          <strong>{i18n['options.index-music'][lang]}</strong>
          <span className="run-control">
            <ToggleSwitch
              name="index_music"
              value={indexMusic}
              disabled={indexingServiceState === 'indexing' || indexingServiceState === 'paused'}
              onChange={(val) => setIndexMusic(val)}
            />
          </span>
        </div>
        <div className={'indexingRow'}>
          <strong>{i18n['options.index-photos'][lang]}</strong>
          <span className="run-control">
            <ToggleSwitch
              name="index_photos"
              value={indexPhotos}
              disabled={indexingServiceState === 'indexing' || indexingServiceState === 'paused'}
              onChange={(val) => setIndexPhotos(val)}
            />
          </span>
        </div>
        <div className={'indexingRow'} title="Coming soon">
          <strong>{i18n['options.index-movies'][lang]}</strong>
          <span className="run-control">
            <ToggleSwitch
              name="index_movies"
              value={indexMovies}
              disabled={true}
              onChange={(val) => setIndexMovies(val)}
            />
          </span>
        </div>
        <div className={'indexingRow'} title="Coming soon">
          <strong>{i18n['options.index-tv'][lang]}</strong>
          <span className="run-control">
            <ToggleSwitch
              name="index_tv"
              value={indexTV}
              disabled={true}
              onChange={(val) => setIndexTV(val)}
            />
          </span>
        </div>
      </div>
    </CardGrid.Card>
  )
}

export default Indexer
