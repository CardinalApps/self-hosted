import { useSelector } from 'react-redux'

import H2 from '@cardinalapps/ui/src/components/typography/H2'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Card from '@cardinalapps/ui/src/components/layout/Card'
import I11nFadeIn from '@cardinalapps/ui/src/components/layout/I11nFadeIn'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'

import '../styles.css'

type HelpProps = {
  next: () => void,
  prev: () => void,
}

function Help({
  next,
  prev,
}: HelpProps) {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <>
      <I11nFadeIn duration={0.3}>
        <Card
          className={'card'}
          padding="thick"
          icon={<i className="fas fa-comments" />}
          iconSize="l"
          header={<H2 className={'title'}>{i18n['help.title'][lang]}</H2>}
          footer={
            <>
              <Button onClick={prev} textual={true}>
                {i18n['prev'][lang]}
              </Button>
              <Button onClick={next} textual={true}>
                {i18n['help.next'][lang]}
              </Button>
            </>
          }
        >
          <p className={'message'} dangerouslySetInnerHTML={{ __html: i18n['help.message-p1'][lang] }} />
          <p className={'message'} dangerouslySetInnerHTML={{ __html: i18n['help.message-p2'][lang] }} />
        </Card>
      </I11nFadeIn>
    </>
  )
}

export default Help
