import { useSelector } from 'react-redux'
import { TargetAndTransition, motion } from 'framer-motion'

import H2 from '@cardinalapps/ui/src/components/typography/H2'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Card from '@cardinalapps/ui/src/components/layout/Card'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'

import '../styles.css'

type PrivacyProps = {
  next: () => void,
  prev: () => void,
  cardAnimation: TargetAndTransition,
}

function Privacy({
  next,
  prev,
  cardAnimation,
}: PrivacyProps) {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={cardAnimation}
      >
        <Card
          className={'card'}
          padding="thick"
          icon={<i className="fas fa-handshake" />}
          iconSize="l"
          header={<H2 className={'title'}>{i18n['privacy.title'][lang]}</H2>}
          footer={
            <>
              <Button onClick={prev} textual={true}>
                {i18n['prev'][lang]}
              </Button>
              <Button onClick={next} textual={true}>
                {i18n['privacy.next'][lang]}
              </Button>
            </>
          }
        >
          <p className={'message'} dangerouslySetInnerHTML={{ __html: i18n['privacy.message-p1'][lang] }} />
        </Card>
      </motion.div>
    </>
  )
}

export default Privacy
