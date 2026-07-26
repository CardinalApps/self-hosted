import { useContext, useState } from 'react'
import { useSelector } from 'react-redux'

import Button from '../../../../interaction/Button'
import Confirm from '../../../../interaction/Confirm'

import { RouterContext } from '../../../../../context/router'
import { useAppDispatch } from '../../../../../hooks/useAppDispatch'
import { useHasCapability } from '../../../../../hooks/useHasCapability'
import homeServerAPI from '../../../../../lib/homeserver/homeServerAPI'
import { AdminRoutes } from '../../../../../lib/net/router'
import { globalActions } from '../../../../../store/constants/actions'
import { layoutActions } from '../../../../../store/slices/layout'
import { settingsSelectors } from '../../../../../store/slices/settings'
import { toastActions } from '../../../../../store/slices/toast'
import healthCheck from '../../../../../store/slices/homeServer/thunks/healthCheck'

import i18n from '../../i18n'

// The Media Server rejects the reset unless it receives this phrase verbatim, so it is
// the one string here that stays in English.
const VALIDATION_PHRASE = 'Factory reset'

/**
 * Wipes the Media Server and returns the user to First Time Setup.
 */
const FactoryResetButton = () => {
  const dispatch = useAppDispatch()
  const { navigate } = useContext(RouterContext)
  const { lang } = useSelector(settingsSelectors.current)
  const userCanFactoryReset = useHasCapability('MediaServer.FactoryReset')
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Resets the server, then drops the session: the account that asked for this no longer
  // exists, and the server it belonged to is waiting to be set up again.
  const factoryReset = async () => {
    setResetting(true)

    try {
      await homeServerAPI('/reset', 'POST', {
        body: {
          type: 'factory',
          validationString: VALIDATION_PHRASE,
        },
      })
    } catch {
      setResetting(false)
      dispatch(toastActions.addToQueue({
        type: 'danger',
        title: i18n['settings.factory-reset.error-toast'][lang],
        ttl: 5000,
      }))
      return
    }

    dispatch(layoutActions.setSettingsPanelOpen(false))
    dispatch({ type: globalActions.RESET })
    navigate(AdminRoutes.first_time_setup)
    dispatch(healthCheck())
  }

  return (
    <>
      <Button
        data-testid="factory-reset-button"
        color="danger"
        disabled={!userCanFactoryReset}
        onClick={() => setConfirming(true)}
      >
        {i18n['settings.factory-reset.button'][lang]}
      </Button>
      {!!confirming &&
        <Confirm
          title={i18n['settings.factory-reset.confirm-title'][lang]}
          message={i18n['settings.factory-reset.confirm-message'][lang]}
          mustEnterText={VALIDATION_PHRASE}
          confirmButtonIsDangerous={true}
          loading={resetting}
          onClose={(confirmed) => {
            if (confirmed) {
              factoryReset()
            } else {
              setConfirming(false)
            }
          }}
        />
      }
    </>
  )
}

const factoryReset = (app?, lang?) => {
  return Object.freeze({
    slug: 'factory_reset',
    type: 'button',
    label: i18n['settings.factory-reset.label'][lang],
    description: i18n['settings.factory-reset.description'][lang],
    render: () => <FactoryResetButton />,
  })
}

export default factoryReset
