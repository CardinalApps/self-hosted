import { useEffect, useState } from 'react'

import Loading from '../../layout/Loading'

import i18n from './i18n'

import './AppBase.css'

export default function AppLoading() {
  const [showLongLoadWarning, setShowLongLoadWarning] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLongLoadWarning(true)
    }, 10000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="app-loading">
      <Loading />
      {showLongLoadWarning
        ? <div className="message">
            <p>{i18n['long-load-time-message']['en']}</p>
          </div>
        : <></>
      }
    </div>
  )
}
