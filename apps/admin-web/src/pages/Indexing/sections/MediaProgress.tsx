import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import H5 from '@cardinalapps/ui/src/components/typography/H5'
import ProgressBar from '@cardinalapps/ui/src/components/layout/ProgressBar'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'

import homeServerAPI from '@cardinalapps/ui/src/lib/homeserver/homeServerAPI'

import { indexingSelectors, indexingActions, SSEIndexingUpdate } from '@cardinalapps/ui/src/store/slices/indexing'

import i18n from '../i18n.json'

function Indexer() {
  const dispatch = useDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const musicFound = useSelector(indexingSelectors.musicFound)
  const musicIndexed = useSelector(indexingSelectors.musicIndexed)
  const musicSkipped = useSelector(indexingSelectors.musicSkipped)
  const musicErrored = useSelector(indexingSelectors.musicErrored)
  const photosFound = useSelector(indexingSelectors.photosFound)
  const photosIndexed = useSelector(indexingSelectors.photosIndexed)
  const photosSkipped = useSelector(indexingSelectors.photosSkipped)
  const photosErrored = useSelector(indexingSelectors.photosErrored)
  const moviesFound = useSelector(indexingSelectors.moviesFound)
  const moviesIndexed = useSelector(indexingSelectors.moviesIndexed)
  const moviesSkipped = useSelector(indexingSelectors.moviesSkipped)
  const moviesErrored = useSelector(indexingSelectors.moviesErrored)
  const tvFound = useSelector(indexingSelectors.tvFound)
  const tvIndexed = useSelector(indexingSelectors.tvIndexed)
  const tvSkipped = useSelector(indexingSelectors.tvSkipped)
  const tvErrored = useSelector(indexingSelectors.tvErrored)

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

  return (
    <CardGrid.Card
      size="l"
      header={
        <>
          <H5>{i18n['status.media-progress.title'][lang]}</H5>
        </>
      }
    >
      <div className={'progressBar'}>
        <p>{i18n['status.progress.music'][lang]}</p>
        <ProgressBar
          current={(musicIndexed + musicSkipped + musicErrored) || 0}
          total={musicFound}
          showCount={true}
        />
      </div>
      <div className={'progressBar'}>
        <p>{i18n['status.progress.photos'][lang]}</p>
        <ProgressBar
          current={(photosIndexed + photosSkipped + photosErrored) || 0}
          total={photosFound}
          showCount={true}
        />
      </div>
      <div className={'progressBar'}>
        <p>{i18n['status.progress.movies'][lang]}</p>
        <ProgressBar
          current={(moviesIndexed + moviesSkipped + moviesErrored) || 0}
          total={moviesFound}
          showCount={true}
        />
      </div>
      <div className={'progressBar'}>
        <p>{i18n['status.progress.tv'][lang]}</p>
        <ProgressBar
          current={(tvIndexed + tvSkipped + tvErrored) || 0}
          total={tvFound}
          showCount={true}
        />
      </div>
    </CardGrid.Card>
  )
}

export default Indexer
