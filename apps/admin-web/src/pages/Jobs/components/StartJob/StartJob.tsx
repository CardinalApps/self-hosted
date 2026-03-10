import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import H4 from '@cardinalapps/ui/src/components/typography/H4'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import WrittenText from '@cardinalapps/ui/src/components/typography/WrittenText'
import Card from '@cardinalapps/ui/src/components/layout/Card'
import Button from '@cardinalapps/ui/src/components/interaction/Button'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'

import {
  useStartJobMutation,
} from '@cardinalapps/ui/src/store/apis/jobs'

import i18n from '../../i18n.json'

import './styles.css'
import useHasCapability from '@cardinalapps/ui/src/hooks/useHasCapability'

type StartJobProps = {
  jobType: string,
  refetchActiveJobs: () => void,
  close: () => void,
}

function StartJob({
  jobType,
  refetchActiveJobs,
  close = () => {},
}: StartJobProps) {
  const dispatch = useDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const userCanStartJobs = useHasCapability('Jobs.Create')
  const [showConfigure, setShowConfigure] = useState(false)
  const [startJob, startJobResult] = useStartJobMutation()

  /**
   * Toggle configuration parameters.
   */
  useEffect(() => {
    setShowConfigure(false)
  }, [jobType])

  /**
   * Hide when the job has started successfully.
   */
  useEffect(() => {
    if (startJobResult.isSuccess) {
      close()
      refetchActiveJobs()
    }
  }, [startJobResult.isSuccess])

  /**
   * Show an error toast if we couldn't start the job.
   */
  useEffect(() => {
    if (startJobResult.isError) {
      dispatch(toastActions.addToQueue({
        type: 'danger',
        ttl: 10000,
        title: i18n['jobs.error.could-not-create'][lang],
        // @ts-expect-error fixme
        body: `<strong>${startJobResult?.error?.status}</strong> - ${startJobResult?.error?.data?.message}`,
        showClose: true,
      }))
    }
  }, [startJobResult.isError])

  return (
    <section className={'startJob'}>
      <Card
        className={'newJobCard'}
        border={0}
        bg={1}
        shadow={2}
        footer={
          <div className={'jobControls'}>
            <div>
              <a
                href={`https://help.cardinalapps.io/guides/cardinal-media-server/jobs/${jobType.replaceAll('_', '-')}`}
                className={'link'}
                target="_blank"
              >
                {i18n[`job.docs`]?.[lang]}
                <i className="fas fa-external-link-alt" />
              </a>
            </div>
            <div className={'buttons'}>
              {/* <Button
                onClick={() => setShowConfigure(!showConfigure)}
                textual
              >
                {i18n[`job.button.configure`]?.[lang]}
              </Button> */}
              <Button
                onClick={() => startJob({ type: jobType })}
                textual
                animation={startJobResult.isLoading ? 'loading' : undefined}
                disabled={!userCanStartJobs}
              >
                {i18n[`job.button.start`]?.[lang]}
              </Button>
            </div>
          </div>
        }
      >
        <p className={'newJobLabel'}>{i18n['start-new-job'][lang]}</p>
        <H4>{i18n[`job.${jobType}.title`]?.[lang]}</H4>
        <WrittenText className={'desc'} dangerouslySetInnerHTML={{ __html: i18n[`job.${jobType}.desc`]?.[lang] }} />
        {!!showConfigure &&
          <>
            <H5>{i18n[`job.configure.title`]?.[lang]}</H5>
            <p className={'noConfigurations'}>{i18n['no-configurations'][lang]}</p>
          </>
        }
      </Card>
    </section>
  )
}

export default StartJob
