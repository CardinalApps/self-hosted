import { useState, useEffect, useRef } from 'react'
import type { CSSProperties, PropsWithChildren } from 'react'
import { v4 as uuid } from 'uuid'
import clsx from 'clsx'

import BrandLogo from '../../layout/BrandLogo'

import { toastActions } from '../../../store/slices/toast'
import { setJwt, JWT_TYPE, deleteJWT } from '../../../lib/auth/jwt'
import authAPI from '../../../lib/auth/authAPI'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import Loading from '../../layout/Loading'

import './SSOLogin.css'

// TODO use topology package
const SSO_URL_DEV = 'http://localhost:3077'
const SSO_URL_PROD = 'https://account.cardinalapps.io'

export const SSO_DEBUG_PARAM = '?___debugSSO' as const

export const IPC_HANDSHAKE_READY_SIGNAL = 'CARDINAL_SSO_READY' as const
export const IPC_HANDSHAKE_SUCCESS_SIGNAL = 'CARDINAL_POPUP_TRUSTS_PARENT' as const
export const IPC_SSO_DONE_SIGNAL = 'CARDINAL_SSO_DONE' as const

export type IPCHandshakeMessageData = {
  appId: string,
  nonce: string,
  instanceId?: string,
  serverName: string,
  userAgentString: string,
  debug: boolean,
}

type SSOLoginProps = {
  appId: string,
  instanceId?: string,
  saveJWTInLocalStorage?: boolean,
  onPopupOpened?: () => void,
  onSSOSuccess?: (JWT?: string, exchangeToken?: string) => void,
  onPopupClosed?: () => void,
  label?: string,
  ssoUrl?: string,
  serverName?: string,
  style?: CSSProperties,
}

/**
 * Allows the user to input search queries. OIDC values must match what is in
 * the app registry.
 */
const SSOLogin = ({
  appId,
  instanceId,
  onPopupOpened,
  onSSOSuccess,
  onPopupClosed,
  label = 'Sign in with Cardinal Cloud',
  ssoUrl,
  serverName = '(Not set)',
  style,
}: PropsWithChildren<SSOLoginProps>) => {
  const dispatch = useAppDispatch()
  const ssoFlowWindow = useRef(null)
  const ssoWindowClosedInterval = useRef(null)
  const [ssoFlowIsOpen, setSSOFlowIsOpen] = useState(false)
  const [nonce, setNonce] = useState(uuid())

  const debug = window.location.search.includes(SSO_DEBUG_PARAM)

  /**
   * TODO use topology package
   */
  if (!ssoUrl) {
    ssoUrl = window.location.href.includes('//localhost:') || window.location.href.includes('//127.0.0.1:')
      ? SSO_URL_DEV
      : SSO_URL_PROD
  }

  /**
   * Handle all incoming IPC messages from the child window that is running the
   * SSO flow.
   */
  const handlePopupWindowMessage = (e) => {
    if (debug) console.log('Received postMessage in SSOLogin', e)

    if (!e.isTrusted) {
      throw new Error('Got untrusted message')
    }

    // Popup says it's ready - send our app ID
    if (e.origin === ssoUrl && e?.data?.CARDINAL_SSO_READY) {
      const dataToSend: IPCHandshakeMessageData = {
        appId,
        nonce,
        instanceId,
        serverName: serverName as string,
        userAgentString: navigator.userAgent,
        debug,
      }
      ssoFlowWindow.current.postMessage(dataToSend, ssoUrl)
      if (debug) console.log('Sent initial postMessage', dataToSend)
    }

    // Popup got the app ID - handshake complete
    if (e.origin === ssoUrl && e?.data?.[IPC_HANDSHAKE_SUCCESS_SIGNAL]) {
      if (debug) console.log('Cardinal SSO popup initial handshake complete')
    }

    // New SSO flow uses this property with the JWT attached
    if (e.origin === ssoUrl && e?.data?.[IPC_SSO_DONE_SIGNAL]) {
      const JWT = e?.data?.JWT
      const exchangeToken = e?.data?.exchangeToken
      setJwt(JWT, JWT_TYPE.CLOUD_USER)
      onSSOSuccess(JWT, exchangeToken)
    }
  }

  /**
   * When the popup is opened, start listening for messages. We can't do
   * anything until we get a "ready" message from the popup.
   */
  useEffect(() => {
    if (ssoFlowIsOpen) {
      if (typeof onPopupOpened === 'function') {
        onPopupOpened()
      }

      window.addEventListener('message', handlePopupWindowMessage)

      if (!ssoWindowClosedInterval.current) {
        // Check every 500ms if the popup is still open.
        ssoWindowClosedInterval.current = setInterval(() => {
          if (ssoFlowWindow?.current?.closed) {
            clearInterval(ssoWindowClosedInterval.current)
            ssoWindowClosedInterval.current = null
            ssoFlowWindow.current = null
            setSSOFlowIsOpen(false)
            setNonce(uuid())
            if (typeof onPopupClosed === 'function') {
              onPopupClosed()
            }
          }
        }, 500)
      }

      return () => window.removeEventListener('message', handlePopupWindowMessage)
    }
  }, [ssoFlowIsOpen])

  /**
   * Begins the SSO flow by fetching an interactive login session URL from the
   * auth server.
   */
  const getInteractiveSSOLoginUrl = () => {
    return new Promise((resolve, reject) => {
      authAPI('/sso/interactive-login-session', 'POST', {
        body: {
          appId,
          nonce,
          instanceId,
          serverName: serverName,
        },
      })
        .then(resolve)
        .catch((err) => {
          deleteJWT(JWT_TYPE.CLOUD_USER)
          dispatch(toastActions.addToQueue({
            title: 'Could not create interactive login session',
            body: err?.message,
            type: 'danger',
          }))
          reject()
        })
    })
  }

  /**
   * Handle the click of a "Login with Cardinal" button. It must open a new
   * window immediately for it to work on mobile.
   */
  const handleSSOClick = () => {
    if (ssoFlowWindow.current) {
      ssoFlowWindow.current.focus()
    } else {
      const newWin = window.open()
      getInteractiveSSOLoginUrl()
        .then((res: { interactiveLoginUrl: string }) => {
          newWin.location.href = debug
            ? `${res.interactiveLoginUrl}?${SSO_DEBUG_PARAM}`
            : res.interactiveLoginUrl
          ssoFlowWindow.current = newWin
          setSSOFlowIsOpen(true)
        })
        .catch(() => {
          newWin.close()
        })
    }
  }

  return (
    <>
      <a
        className={clsx('login-with-cardinal-button', ssoFlowIsOpen ? 'loading' : '')}
        target="_blank"
        rel="noreferrer"
        style={style}
        onClick={handleSSOClick}
      >
        <Loading size="s" />
        <BrandLogo size="xs" icon="birb"/>
        <span>{label}</span>
      </a>
    </>
  )
}

export default SSOLogin
