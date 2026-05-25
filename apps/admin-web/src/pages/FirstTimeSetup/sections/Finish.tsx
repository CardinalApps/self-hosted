import { useSelector } from 'react-redux'

import H2 from '@cardinalapps/ui/src/components/typography/H2'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Card from '@cardinalapps/ui/src/components/layout/Card'
import I11nFadeIn from '@cardinalapps/ui/src/components/layout/I11nFadeIn'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'

import '../styles.css'

type FinishProps = {
  handleFinishSetup: () => void,
  prev: () => void,
  finishButtonState: string,
}

function Finish({
  handleFinishSetup,
  prev,
  finishButtonState,
}: FinishProps) {
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <>
      <I11nFadeIn className={'finish'} duration={0.3}>
        <Card
          className={'card'}
          padding="thick"
          icon={<i className="fas fa-home" />}
          iconSize="l"
          header={<H2 className={'title'}>{i18n['finish.title'][lang]}</H2>}
          footer={
            <>
              <Button onClick={prev} textual={true}>
                {i18n['prev'][lang]}
              </Button>
              <Button animation={finishButtonState} onClick={handleFinishSetup} textual={true}>
                {i18n['finish.next'][lang]}
              </Button>
            </>
          }
        >
          <p className={'message'} dangerouslySetInnerHTML={{ __html: i18n['finish.message-p1'][lang] }} />
        </Card>
      </I11nFadeIn>
    </>
  )
}

export default Finish
