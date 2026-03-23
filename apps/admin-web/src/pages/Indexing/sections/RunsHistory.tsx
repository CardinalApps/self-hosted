import { useState, useEffect, ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'

import Button from '@cardinalapps/ui/src/components/interaction/Button'
import ToggleSwitch from '@cardinalapps/ui/src/components/forms/ToggleSwitch'
import Modal from '@cardinalapps/ui/src/components/layout/Modal'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import List from '@cardinalapps/ui/src/components/interaction/List'
import { ListItem } from '@cardinalapps/ui/src/components/interaction/List/List'
import Confirm from '@cardinalapps/ui/src/components/interaction/Confirm'
import homeServerAPI from '@cardinalapps/ui/src/lib/homeserver/homeServerAPI'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'
import useHasCapability from '@cardinalapps/ui/src/hooks/useHasCapability'

import { useGetRunsQuery } from '@cardinalapps/ui/src/store/apis/runs'
import { indexingSelectors } from '@cardinalapps/ui/src/store/slices/indexing'

import { formatTimeAgo, formatDate } from '@cardinalapps/ui/src/lib/formatting/time'

import i18n from '../i18n.json'

function RunsHistory() {
  const itemsPerPage = 10
  const dispatch = useAppDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const userCanDeindex = useHasCapability('Indexing.Deindex')
  const serverState = useSelector(indexingSelectors.serverState)
  const initialTake = 5
  const [take, setTake] = useState(initialTake)
  const [includeEmptyRuns, setIncludeEmptyRuns] = useState(false)
  const [importedFilesModalContent, setImportedFilesModalContent] = useState<ReactNode>()
  const { data, isLoading, refetch } = useGetRunsQuery({ take, skip: 0, includeEmptyRuns })
  const [pagedRuns, totalRuns] = data || []

  const [showDeindexConfirm, setShowDeindexConfirm] = useState(false)
  const [deindexingIsLoading, setDeindexingIsLoading] = useState(false)

  const indexedCountString = (num) => {
    if (num === 0 || !num) {
      return i18n['run.file-count.0'][lang]
    } else {
      return i18n['run.file-count.added'][lang].replace('{num}', num)
    }
  }

  const countButton = (icon, fileList = []) => {
    if (fileList?.length) {
      const list = fileList.map((path) => <li key={path}>{path}</li>)
      return (
        <Button
          onClick={() => setImportedFilesModalContent(<ol className={'fileList'}>{list}</ol>)}
        >
          <span>
            <i className={icon} />
            <span>{indexedCountString(fileList.length)}</span>
          </span>
        </Button>
      )
    } else {
      return null
    }
  }

  const handleLoadMore = () => {
    if (take === initialTake) {
      setTake(itemsPerPage)
    } else {
      setTake(take + itemsPerPage)
    }
  }

  const handleResetMediaDataClick = () => {
    setDeindexingIsLoading(true)
    homeServerAPI('/reset', 'POST', {
      body: {
        type: 'media',
        validationString: 'Deindex media',
      },
    })
      .then(() => {
        setShowDeindexConfirm(false)
        setDeindexingIsLoading(false)
        dispatch(toastActions.addToQueue({
          title: i18n['data.media-reset.success-toast.title'][lang],
          type: 'success',
          ttl: 5000,
        }))
      })
      .catch(() => {
        setDeindexingIsLoading(false)
      })
  }

  useEffect(() => {
    if (serverState === 'completed') {
      refetch()
    }
  }, [serverState])

  const listItems = (): ListItem[] => {
    if (!pagedRuns?.length) {
      return []
    }
    return pagedRuns.map((run) => {
      return {
        title: formatDate(run?.createdAt),
        icon: run?.status === 'completed'
          ? { fa: 'fas fa-check', className: 'success-color' }
          : run?.status === 'stopped_by_user'
            ? { fa: 'fas fa-stop-circle', className: 'warning-color' }
            : run?.status === 'not_started'
              ? { fa: 'fas fa-times', className: 'success-color' }
              : null,
        name: formatTimeAgo(run?.createdAt),
        label: (
          <>
            <div className="counts">
              {countButton("fas fa-music", run?.musicIndexed)}
              {countButton("fas fa-images", run?.photosIndexed)}
              {countButton("fas fa-film", run?.moviesIndexed)}
              {countButton("fas fa-tv", run?.tvIndexed)}
              {!run?.musicIndexed?.length && !run?.photosIndexed?.length && !run?.moviesIndexed?.length && !run?.tvIndexed?.length && (
                i18n['run.history.no-change'][lang]
              )}
            </div>
          </>
        ),
      } as ListItem
    })
  }

  return (
    <CardGrid.Card
      className="indexing-history"
      size="l"
      header={
        <>
          <H5>{i18n['run.history.title'][lang]}</H5>
        </>
      }
      headerRight={
        <>
          <ToggleSwitch
            label={i18n['run.history.show-empty-runs'][lang]}
            labelAlign="left"
            value={includeEmptyRuns}
            value1={false}
            value2={true}
            onChange={(value) => setIncludeEmptyRuns(value)}
          />
        </>
      }
      footer={
        <>
          <Button
            onClick={() => setShowDeindexConfirm(true)}
            disabled={!userCanDeindex}
          >
            {i18n['data.media-reset.button'][lang]}
          </Button>
        </>
      }
    >
      <List
        className="server-info-list"
        layout="compact"
        items={listItems()}
      />
      {!!importedFilesModalContent &&
        <Modal width={1200} onClose={() => setImportedFilesModalContent(null)}>
          {importedFilesModalContent}
        </Modal>
      }
      {pagedRuns?.length
        ? <div className={'runsArchive'}>
            {pagedRuns.length < totalRuns &&
              <div className={'loadMore'}>
                <Button onClick={handleLoadMore} animation={isLoading ? 'loading' : undefined}>
                  {i18n['run.history.load-more'][lang]}
                </Button>
              </div>
            }
          </div>
        : null
      }
      {!!showDeindexConfirm &&
        <Confirm
          title={i18n['data.media-reset.confirm-title'][lang]}
          message={i18n['data.confirm-media-reset'][lang]}
          mustEnterText={'Deindex media'}
          confirmButtonIsDangerous={true}
          loading={deindexingIsLoading}
          onClose={(confirmed) => {
            if (confirmed) {
              handleResetMediaDataClick()
            }
            setShowDeindexConfirm(false)
          }}
        />
      }
    </CardGrid.Card>
  )
}

export default RunsHistory
