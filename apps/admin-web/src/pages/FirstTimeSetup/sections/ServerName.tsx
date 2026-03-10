import { useSelector } from 'react-redux'
import { TargetAndTransition, motion } from 'framer-motion'

import H2 from '@cardinalapps/ui/src/components/typography/H2'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import TextInput from '@cardinalapps/ui/src/components/forms/TextInput'
import Card from '@cardinalapps/ui/src/components/layout/Card'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'

import '../styles.css'

type ServerNameProps = {
  next: () => void,
  prev: () => void,
  serverName: string,
  setServerName: (name: string) => void,
  cardAnimation: TargetAndTransition,
}

function ServerName({
  next,
  prev,
  serverName,
  setServerName,
  cardAnimation,
}: ServerNameProps) {
  const { lang } = useSelector(settingsSelectors.current)

  const handleServerNameOnChange = (val) => {
    // Allow an empty string so that the user can fully erase the input. The
    // "next" button won't let them go forward if it's empty.
    const valid = (val.match(/[A-Za-z-_1234567890]/gm)?.length === val.length) || val.length === 0
    if (valid) {
      setServerName(val)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={cardAnimation}
      >
        <Card
          className={'card'}
          padding="thick"
          icon={<i className="fas fa-signature" />}
          iconSize="l"
          header={<H2 className={'title'}>{i18n['server-name.title'][lang]}</H2>}
          footer={
            <>
              <Button onClick={prev} textual={true}>
                {i18n['prev'][lang]}
              </Button>
              <Button
                textual={true}
                onClick={() => {
                  if (serverName) {
                    next()
                  }
                }}
              >
                {i18n['next'][lang]}
              </Button>
            </>
          }
        >
          <p className={'message'}>{i18n['server-name.p1'][lang]}</p>
          <p className={'message'}>{i18n['server-name.p2'][lang]}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (serverName) {
                next()
              }
            }}
          >
            <TextInput
              type="text"
              name="sever-name"
              maxLength={64}
              value={serverName}
              onChange={(value) => handleServerNameOnChange(value)}
            />
          </form>
        </Card>
      </motion.div>
    </>
  )
}

export default ServerName
