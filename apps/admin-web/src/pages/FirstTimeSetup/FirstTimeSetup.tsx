import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'

import BrandLogo from '@cardinalapps/ui/src/components/layout/BrandLogo'
import I11nFadeIn from '@cardinalapps/ui/src/components/layout/I11nFadeIn'

import { toastActions } from '@cardinalapps/ui/src/store/slices/toast'
import { homeServerSelectors, homeServerActions } from '@cardinalapps/ui/src/store/slices/homeServer'
import { homeServerUserSelectors } from '@cardinalapps/ui/src/store/slices/homeServerUser'
import homeServerLogin from '@cardinalapps/ui/src/store/slices/homeServerUser/thunks/login'

import Welcome from './sections/Welcome'
import Theme from './sections/Theme'
import ServerName from './sections/ServerName'
import Login from './sections/Login'
import UsageData from './sections/UsageData'
import Privacy from './sections/Privacy'
import Help from './sections/Help'
import Finish from './sections/Finish'

import homeServerAPI from '@cardinalapps/ui/src/lib/homeserver/homeServerAPI'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import * as routes from '../../routes'

import i18n from './i18n.json'

import './styles.css'

function FirstTimeSetup() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { lang } = useAppSelector(settingsSelectors.current)
  const health = useAppSelector(homeServerSelectors.health)
  const firstTimeSetupComplete = useAppSelector(homeServerSelectors.firstTimeSetupComplete)
  const homeServerUserLoggedIn = useAppSelector(homeServerUserSelectors.loggedIn)
  const [finishButtonState, setFinishButtonState] = useState<string>()
  const [step, setStep] = useState(1)
  const [visibleStepNum, setVisibleStepNum] = useState(step)
  const [theme, setTheme] = useState('light')
  const [serverName, setServerName] = useState('')
  const [agreeToAnonymousUsageData, setAgreeToAnonymousUsageData] = useState(true)

  // The user who logs into their account during the First Time Setup will be
  // kept here instead of being fully logged in
  const [userObjectOfFutureOwner, setUserObjectOfFutureOwner] = useState({})
  const [ssoJWTOfFutureOwner, setSsoJWTOfFutureOwner] = useState()

  const fadeOutDuration = 0.4

  /**
   * Set next step after allowing enough time for current step to animate out.
   */
  const next = () => {
    setStep(null)
    setTimeout(() => {
      setStep(step + 1)
    }, 500)
  }

  /**
   * Set prev step after allowing enough time for current step to animate out.
   */
  const prev = () => {
    setStep(null)
    setTimeout(() => {
      setStep(step - 1)
    }, 500)
  }

  /**
   * Send all the collected setup data from the user.
   */
  const handleFinishSetup = () => {
    setFinishButtonState('loading')
    homeServerAPI('/setup', 'POST', {
      body: {
        theme,
        serverName,
        sendAnonymousUsageData: agreeToAnonymousUsageData,
        ssoToken: ssoJWTOfFutureOwner,
      },
    })
      .then((res: { accountToLogInto: string }) => {
        setFinishButtonState('')
        dispatch(homeServerActions.setFirstTimeSetupComplete(true))
        if (res?.accountToLogInto) {
          dispatch(homeServerLogin({
            userId: res?.accountToLogInto,
            cardinalSSOToken: ssoJWTOfFutureOwner,
          }))
        }
      })
      .catch((res) => {
        setFinishButtonState('')
        dispatch(toastActions.addToQueue({
          title: res.message,
          ttl: 5000,
          type: 'danger',
        }))
      })
  }

  /**
   * Only allow access to this page if the last server health response had the
   * "not_setup" status.
   */
  useEffect(() => {
    if (step) {
      setVisibleStepNum(step)
    }
  }, [step])

  /**
   * Only allow access to this page if the last server health response had the
   * "not_setup" status.
   */
  useEffect(() => {
    if (health !== 'not_setup') {
      navigate(routes.LOGIN)
    }
  }, [health])

  /**
   * Exit the First Time Setup once the setup is complete.
   */
  useEffect(() => {
    if (homeServerUserLoggedIn && firstTimeSetupComplete) {
      navigate(routes.LOGIN)
    }
  }, [homeServerUserLoggedIn, firstTimeSetupComplete])

  return (
    <div className={'firstTimeSetup'}>
      {(step >= 2 || step === null) &&
        <I11nFadeIn className={'header logo'} delay={0.6} duration={0.8}>
          <div>
            <BrandLogo icon="birb" />
          </div>
          <div>
            <div className="setup-progress">
              {/* Don't count splash screen */}
              <span>{visibleStepNum - 1} {i18n['progress.sep'][lang]} 7</span>
            </div>
          </div>
        </I11nFadeIn>
      }
      <AnimatePresence>
        {step === 1 &&
          <motion.section
            key="welcome"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: fadeOutDuration } }}
          >
            <Welcome next={next} />
          </motion.section>
        }
        {step === 2 &&
          <motion.section
            key="theme"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: fadeOutDuration } }}
          >
            <Theme
              next={next}
              setTheme={setTheme}
            />
          </motion.section>
        }
        {step === 3 &&
          <motion.section
            key="server-name"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: fadeOutDuration } }}
          >
            <ServerName
              next={next}
              prev={prev}
              serverName={serverName}
              setServerName={setServerName}
            />
          </motion.section>
        }
        {step === 4 &&
          <motion.section
            key="login"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: fadeOutDuration } }}
          >
            <Login
              next={next}
              prev={prev}
              userObjectOfFutureOwner={userObjectOfFutureOwner}
              setUserObjectOfFutureOwner={setUserObjectOfFutureOwner}
              setSsoJWTOfFutureOwner={setSsoJWTOfFutureOwner}
              overrideServerName={serverName}
            />
          </motion.section>
        }
        {step === 5 &&
          <motion.section
            key="privacy"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: fadeOutDuration } }}
          >
            <UsageData
              next={next}
              prev={prev}
              agreeToAnonymousUsageData={agreeToAnonymousUsageData}
              setAgreeToAnonymousUsageData={setAgreeToAnonymousUsageData}
            />
          </motion.section>
        }
        {step === 6 &&
          <motion.section
            key="privacy"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: fadeOutDuration } }}
          >
            <Privacy
              next={next}
              prev={prev}
            />
          </motion.section>
        }
        {step === 7 &&
          <motion.section
            key="help"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: fadeOutDuration } }}
          >
            <Help next={next} prev={prev} />
          </motion.section>
        }
        {step === 8 &&
          <motion.section
            key="finish"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: fadeOutDuration } }}
          >
            <Finish
              handleFinishSetup={handleFinishSetup}
              prev={prev}
              finishButtonState={finishButtonState}
            />
          </motion.section>
        }
      </AnimatePresence>
    </div>
  )
}

export default FirstTimeSetup
