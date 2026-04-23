import { useContext, useState } from 'react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { motion, useDragControls } from 'framer-motion'

import { homeServerUserSelectors } from '../../../store/slices/homeServerUser'
import { cloudUserSelectors } from '../../../store/slices/cloudUser'
import { globalActions } from '../../../store/constants/actions'
import { getJwt, JWT_TYPE } from '../../../lib/auth/jwt'
import refreshToken from '../../../store/slices/homeServerUser/thunks/refreshToken'

import Select from '../../forms/Select'
import Button from '../../interaction/Button'
import TextInput from '../../forms/TextInput'
import H6 from '../../typography/H6'
import { RouterContext } from '../../../context/router'

import i18n from './i18n'

import './AppBase.css'

export default function AppLoading() {
  const { location, navigate } = useContext(RouterContext)
  const dispatch = useAppDispatch()
  const dragControls = useDragControls()
  const homeServerUserLoggedIn = useSelector(homeServerUserSelectors.loggedIn)
  const cloudUserLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const [typedAction, setTypedAction] = useState(`{ "type": "layout/setSidebarMode", "payload": "collapsed" }`)

  function startDrag(event) {
    dragControls.start(event)
  }

  const dispatchTypedAction = () => {
    try {
      dispatch(JSON.parse(typedAction))
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <motion.div className="developer-tools" drag dragListener={false} dragControls={dragControls} dragMomentum={false}>
      <div className="title-bar">
        <H6>{i18n['dev-tools.title']['en']}</H6>
        <motion.div onPointerDown={startDrag}>
          <i className="grab fas fa-grip-vertical" />
        </motion.div>
      </div>
      <div className="developer-tools-list">
        <p className="developer-tools-current-route">{i18n['dev-tools.current-route']['en']} <strong>{location.pathname}</strong></p>
        <ul>
          <li>{i18n['dev-tools.home-server-user-logged-in']['en']} <strong>{homeServerUserLoggedIn?.toString()}</strong></li>
          <li>{i18n['dev-tools.cloud-user-logged-in']['en']} <strong>{cloudUserLoggedIn?.toString()}</strong></li>
        </ul>
        <div className="developer-tools-list">
          <div>
            <span>{i18n['dev-tools.go-to']['en']}</span>
            <Select
              multi={false}
              onChange={(v) => { if (v) navigate(v) }}
              options={{
                '/': '/',
                '/login': '/login',
                '/custom-public': '/custom-public',
                '/custom-private': '/custom-private',
                '/invalid-url': '/invalid-url',
              }}
            />
          </div>
        </div>
        <div className="developer-tools-list">
          <span>{i18n['dev-tools.dispatch.label']['en']}</span>
          <TextInput value={typedAction} onChange={(v) => setTypedAction(v)} />
          <Button onClick={() => dispatchTypedAction() }>{i18n['dev-tools.dispatch.button']['en']}</Button>
        </div>
        <div className="hr" />
        <div className="developer-tools-list">
          <p className="tolkien-warning">
            {i18n['dev-tools.tolkien.warning']['en']}
          </p>
          <Button onClick={() => navigator.clipboard.writeText(getJwt(JWT_TYPE.HOME_SERVER_USER))}>{i18n['dev-tools.copy-local-tolkien.button']['en']}</Button>
          <Button onClick={() => navigator.clipboard.writeText(getJwt(JWT_TYPE.CLOUD_USER))}>{i18n['dev-tools.copy-cloud-tolkien.button']['en']}</Button>
          <Button onClick={() => dispatch(refreshToken())}>{i18n['dev-tools.refresh-tolkien.button']['en']}</Button>
          <Button onClick={() => dispatch({ type: globalActions.RESET })}>{i18n['dev-tools.reset.button']['en']}</Button>
        </div>
      </div>
    </motion.div>
  )
}
