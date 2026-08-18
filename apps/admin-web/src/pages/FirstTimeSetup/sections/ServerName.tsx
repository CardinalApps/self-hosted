import { useSelector } from 'react-redux'

import H2 from '@cardinalapps/ui/src/components/typography/H2'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import TextInput from '@cardinalapps/ui/src/components/forms/TextInput'
import Card from '@cardinalapps/ui/src/components/layout/Card'
import I11nFadeIn from '@cardinalapps/ui/src/components/layout/I11nFadeIn'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'

import '../styles.css'

const SERVER_NAME_PATTERN = /^[A-Za-z0-9 \-_]*$/

type ServerNameProps = {
  next: () => void,
  prev: () => void,
  serverName: string,
  setServerName: (name: string) => void,
}

function ServerName({
  next,
  prev,
  serverName,
  setServerName,
}: ServerNameProps) {
  const { lang } = useSelector(settingsSelectors.current)

  // Blank is allowed so the input can be fully erased; the "next" button is what refuses to advance
  const handleServerNameOnChange = (val) => {
    if (SERVER_NAME_PATTERN.test(val)) {
      setServerName(val)
    }
  }

  return (
    <div data-testid="setup-step" data-step-name="server-name">
      <I11nFadeIn duration={0.3}>
        <Card
          className={'card'}
          padding="thick"
          icon={<Icon fa="fas fa-signature" />}
          iconSize="l"
          header={<H2 className={'title'}>{i18n['server-name.title'][lang]}</H2>}
          footer={
            <>
              <Button data-testid="setup-step-prev" onClick={prev} textual={true}>
                {i18n['prev'][lang]}
              </Button>
              <Button
                data-testid="setup-step-next"
                textual={true}
                onClick={() => {
                  if (serverName.trim()) {
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
              if (serverName.trim()) {
                next()
              }
            }}
          >
            <TextInput
              data-testid="setup-server-name-input"
              type="text"
              name="sever-name"
              maxLength={64}
              value={serverName}
              onChange={(value) => handleServerNameOnChange(value)}
            />
          </form>
        </Card>
      </I11nFadeIn>
    </div>
  )
}

export default ServerName
