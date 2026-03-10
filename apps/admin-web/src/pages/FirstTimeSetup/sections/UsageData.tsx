import React from 'react'
import { useSelector } from 'react-redux'
import { motion, TargetAndTransition } from 'framer-motion'

import H2 from '@cardinalapps/ui/src/components/typography/H2'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Card from '@cardinalapps/ui/src/components/layout/Card'
import ToggleSwitch from '@cardinalapps/ui/src/components/forms/ToggleSwitch'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'

import '../styles.css'

type UsageDataProps = {
  next: () => void,
  prev: () => void,
  cardAnimation: TargetAndTransition,
  agreeToAnonymousUsageData: boolean,
  setAgreeToAnonymousUsageData: React.Dispatch<React.SetStateAction<boolean>>,
}

function UsageData({
  next,
  prev,
  cardAnimation,
  agreeToAnonymousUsageData,
  setAgreeToAnonymousUsageData,
}: UsageDataProps) {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={cardAnimation as TargetAndTransition}
      >
        <Card
          className={'card'}
          padding="thick"
          icon={<i className="fas fa-user-shield" />}
          iconSize="l"
          header={<H2 className={'title'}>{i18n['usage-data.title'][lang]}</H2>}
          footer={
            <>
              <Button onClick={prev} textual={true}>
                {i18n['prev'][lang]}
              </Button>
              <Button onClick={next} textual={true}>
                {i18n['usage-data.next'][lang]}
              </Button>
            </>
          }
        >
          <p className={'message'} dangerouslySetInnerHTML={{ __html: i18n['usage-data.message-p1'][lang] }} />
          <p className={'message'} dangerouslySetInnerHTML={{ __html: i18n['usage-data.message-p2'][lang] }} />
          <div className={'agree'}>
            <p>
              {i18n['usage-data.agree']['en']}
            </p>
            <ToggleSwitch
              name="agree-to-anonymous-usage-data"
              value={agreeToAnonymousUsageData}
              onChange={(val) => setAgreeToAnonymousUsageData(val)}
            />
          </div>
        </Card>
      </motion.div>
    </>
  )
}

export default UsageData
