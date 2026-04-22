import { useState, useEffect, ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'

import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Modal from '@cardinalapps/ui/src/components/layout/Modal'
import Drawer from '@cardinalapps/ui/src/components/layout/Drawer'
import Table from '@cardinalapps/ui/src/components/interaction/Table'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'
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
import type { RunType as RunRecord } from '@cardinalapps/ui/src/store/apis/runs'
import { useGetRunLogsQuery } from '@cardinalapps/ui/src/store/apis/runLogs'
import { indexingSelectors } from '@cardinalapps/ui/src/store/slices/indexing'
import Span from '@cardinalapps/ui/src/components/typography/Span'

import { formatTimeAgo, formatDate } from '@cardinalapps/ui/src/lib/formatting/time'
import { formatWithCommas } from '@cardinalapps/ui/src/lib/formatting/number'

import i18n from '../i18n.json'

const LOGS_PER_PAGE = 12

const SUMMARY_KEYS = ['indexed', 'updated', 'skipped', 'errored'] as const

const MEDIA_TYPE_ICONS: Record<string, string> = {
  music:  'fas fa-music',
  photos: 'fas fa-images',
  movies: 'fas fa-film',
  tv:     'fas fa-tv',
}

function RunsHistory() {
  const itemsPerPage = 10
  const dispatch = useAppDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const userCanDeindex = useHasCapability('Indexing.Deindex')
  const serverState = useSelector(indexingSelectors.serverState)
  const initialTake = 5
  const [take, setTake] = useState(initialTake)
  const [importedFilesModalContent, setImportedFilesModalContent] = useState<ReactNode>()
  const { data, isLoading, refetch } = useGetRunsQuery({ take, skip: 0, includeEmptyRuns: true })
  const [pagedRuns, totalRuns] = data || []

  const [showDeindexConfirm, setShowDeindexConfirm] = useState(false)
  const [deindexingIsLoading, setDeindexingIsLoading] = useState(false)

  const [selectedRun, setSelectedRun] = useState<{ id: number, runId: string } | null>(null)
  const [logsPage, setLogsPage] = useState(1)

  const logsSkip = (logsPage - 1) * LOGS_PER_PAGE
  const { data: logsData, isLoading: isLoadingLogs } = useGetRunLogsQuery(
    { runId: selectedRun?.runId ?? '', take: LOGS_PER_PAGE, skip: logsSkip },
    { skip: !selectedRun },
  )
  const [logs, totalLogs] = logsData || []
  const logsMaxPages = Math.ceil((totalLogs ?? 0) / LOGS_PER_PAGE)

  const handleOpenLogs = (id: number, runId: string) => {
    setLogsPage(1)
    setSelectedRun({ id, runId })
  }

  const runSummaryString = (run: RunRecord) => (
    <>
      <span title={i18n['run.summary.indexed'][lang]}>{`+${formatWithCommas(run?.indexed ?? 0)}`}</span>
      {' / '}
      <span title={i18n['run.summary.skipped'][lang]}>{`~${formatWithCommas(run?.skipped ?? 0)}`}</span>
      {' / '}
      <span title={i18n['run.summary.deleted'][lang]}>{`-${formatWithCommas(run?.deleted ?? 0)}`}</span>
    </>
  )

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
        name: runSummaryString(run),
        label: formatTimeAgo(run?.createdAt),
        controls: ['view'],
        onView: () => handleOpenLogs(run.id, run.runId),
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
      {!!selectedRun &&
        <Drawer
          width='l'
          className="run-logs"
          title={i18n['run.logs.drawer-title'][lang].replace('{num}', selectedRun.id)}
          onClose={() => setSelectedRun(null)}
        >
          <Table
            loading={isLoadingLogs}
            header={[
              <Table.Col width={20} key="media-type">{i18n['run.logs.col.media-type'][lang]}</Table.Col>,
              <Table.Col key="file">{i18n['run.logs.col.file'][lang]}</Table.Col>,
              <Table.Col key="action">{i18n['run.logs.col.action'][lang]}</Table.Col>,
              <Table.Col key="time">{i18n['run.logs.col.time'][lang]}</Table.Col>,
            ]}
            body={(logs ?? []).map((log) => [
              <Table.Col align="center" key={`${log.id}-media-type`}>{log.mediaType ? <Icon fa={MEDIA_TYPE_ICONS[log.mediaType]} title={log.mediaType} /> : '—'}</Table.Col>,
              <Table.Col key={`${log.id}-file`} title={log.filePath ?? undefined}>
                <Span truncate={true}>
                  {log.filePath
                    ? log.filePath.split('/').pop()
                    : SUMMARY_KEYS
                        .filter((k) => log.details?.[k])
                        .map((k) => i18n[`run.logs.summary.${k}`][lang].replace('{num}', String(log.details[k])))
                        .join(', ') || '—'
                  }
                </Span>
              </Table.Col>,
              <Table.Col key={`${log.id}-action`}>{i18n[`run.logs.event.${log.event}`]?.[lang] ?? log.event}</Table.Col>,
              <Table.Col key={`${log.id}-time`}><Span truncate={true}>{formatTimeAgo(log.createdAt)}</Span></Table.Col>,
            ])}
            page={logsPage}
            maxPages={logsMaxPages}
            onPageChange={(newPage) => setLogsPage(newPage)}
          />
        </Drawer>
      }
    </CardGrid.Card>
  )
}

export default RunsHistory
