import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'

import BrandLogo from '@cardinalapps/ui/src/components/layout/BrandLogo'
import H1 from '@cardinalapps/ui/src/components/typography/H1'
import Button from '@cardinalapps/ui/src/components/interaction/Button'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'

import '../styles.css'

type WelcomeProps = {
  next: () => void,
}

function Welcome({
  next,
}: WelcomeProps) {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <>
      <motion.div
        className={'logo'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 1, delay: 0.2 } }}
      >
        <BrandLogo icon="birb" size="l" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 1.3, delay: 1.2 } }}
      >
        <H1 className={'title'}>{i18n['welcome.title'][lang]}</H1>
      </motion.div>
      <motion.p
        className={'subtitle'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 1.3, delay: 2.4 } }}
      >
        {i18n['welcome.subtitle'][lang]}
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 1.3, delay: 3.6 } }}
      >
        <Button onClick={next}>
          {i18n['welcome.start-button'][lang]}
        </Button>
      </motion.div>
    </>
  )
}

export default Welcome
