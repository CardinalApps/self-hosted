import { useSelector } from 'react-redux'

import H2 from '@cardinalapps/ui/src/components/typography/H2'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Card from '@cardinalapps/ui/src/components/layout/Card'
import I11nFadeIn from '@cardinalapps/ui/src/components/layout/I11nFadeIn'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'

import '../styles.css'

type PrivacyProps = {
  next: () => void,
  prev: () => void,
}

function Privacy({
  next,
  prev,
}: PrivacyProps) {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <>
      <I11nFadeIn duration={0.3}>
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
      </I11nFadeIn>
    </>
  )
}

export default Privacy
