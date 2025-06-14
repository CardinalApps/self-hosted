import type { PropsWithChildren, ReactNode } from 'react'

import H5 from '@cardinalapps/ui/src/components/typography/H5'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Card from '@cardinalapps/ui/src/components/layout/Card'

import './styles.css'

import i18n from './i18n.json'

type NoContentMessageProps = {
  showUnavailableMessage: boolean,
  icon: ReactNode,
  title: string,
  button: ReactNode,
  children: ReactNode,
}

function NoContentMessage({
  showUnavailableMessage = false,
  icon,
  title,
  button,
  children,
}: PropsWithChildren<NoContentMessageProps>) {
  return (
    <div className="noContentMessage">
      <Card
        border={0}
        shadow={1}
        bg={1}
        header={icon}
        footer={showUnavailableMessage
          ? <Button href={`https://cardinalapps.io`} target="_blank" solid={true}>
              {i18n['unavailable-button']['en']}
            </Button>
          : button
        }
      >
        {
          showUnavailableMessage
          ?
            <>
              <H5>{i18n['unavailable-title']['en']}</H5>
              <p dangerouslySetInnerHTML={{ __html: i18n['unavailable-desc']['en'] }} />
            </>
          :
            <>
              <H5>{title}</H5>
              {children}
            </>
        }
      </Card>
    </div>
  )
}

export default NoContentMessage
