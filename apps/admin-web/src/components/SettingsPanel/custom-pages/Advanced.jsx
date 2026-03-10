import { useSelector } from 'react-redux'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import Card from '@cardinalapps/ui/src/components/layout/Card'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import WrittenText from '@cardinalapps/ui/src/components/typography/WrittenText'
import { Columns, Column } from '@cardinalapps/ui/src/components/layout/Columns'

import i18n from '../i18n.json'

/**
 * Custom settings pages for the Media Server.
 */
function Advanced() {
  const { lang } = useSelector(settingsSelectors.current)

  // const [showFactoryResetConfirm, setShowFactoryResetConfirm] = useState(false)
  // const [factoryResetIsLoading, setFactoryResetIsLoading] = useState(false)

  // const handleFactoryResetClick = () => {
  //   setFactoryResetIsLoading(true)
  //   homeServerAPI('/reset', 'POST', {
  //     body: {
  //       type: 'factory',
  //       validationString: 'Factory reset',
  //     },
  //   })
  //     .then(() => {
  //       setFactoryResetIsLoading(false)
  //       dispatch(homeServerActions.setFirstTimeSetupComplete(false))
  //       dispatch(healthCheck())
  //     })
  //     .catch(() => {
  //       setFactoryResetIsLoading(false)
  //     })
  // }

  return (
    <Columns
      className={'advancedCols'}
      alignItems="flex-start"
      flexWrap="medium"
      gap={20}
    >
      <Column
        cols={6}
        mediumCols={12}
        smallCols={12}
        className={'advancedCol'}
      >
        <Card
          bg="1"
          shadow="0"
          border="1"
          className={'advancedOption'}
        >
          <H5>{i18n['data.media-reset.title'][lang]}</H5>
          <WrittenText>
            <p>{i18n['data.media-reset.desc'][lang]}</p>
          </WrittenText>
        </Card>
      </Column>
      {/* <Column
        cols={6}
        mediumCols={12}
        smallCols={12}
        className={'advancedCol'}
      >
        <Card
          bg="1"
          shadow="0"
          border="1"
          className={'advancedOption'}
          footer={<Button textual onClick={() => setShowFactoryResetConfirm(true)}>{i18n['data.factory-reset.button'][lang]}</Button>}
        >
          <H5>{i18n['data.factory-reset.title'][lang]}</H5>
          <WrittenText>
            <p>{i18n['data.factory-reset.desc'][lang]}</p>
          </WrittenText>
          {!!showFactoryResetConfirm &&
            <Confirm
              title={i18n['data.factory-reset.confirm-title'][lang]}
              message={i18n['data.confirm-factory-reset'][lang]}
              mustEnterText={'Factory reset'}
              confirmButtonIsDangerous={true}
              loading={factoryResetIsLoading}
              onClose={(confirmed) => {
                if (confirmed) {
                  handleFactoryResetClick()
                } else {
                  setShowFactoryResetConfirm(false)
                }
              }}
            />
          }
        </Card>
      </Column> */}
    </Columns>
  )
}

export default Advanced
