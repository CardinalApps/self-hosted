import { useState, useEffect, PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'
import ms from 'ms'

import { settingsSelectors } from '../../../store/slices/settings'

import i18n from './i18n'

import './TimeCounter.css'

type TimeCounterProps = {
  className?: string,
  title?: string,
  startedAt: number,
  phrase?: string,
  format?: boolean,
}

/**
 * Time counter.
 * 
 * @param {string} [phrase] - Use the merge tag `{time}` in your phrase
 */
const TimeCounter = ({
  className,
  title,
  startedAt,
  phrase,
  format = true,
}: PropsWithChildren<TimeCounterProps>) => {
  const { lang } = useSelector(settingsSelectors.current)
  const [, setNow] = useState(new Date())

  const formatText = () => {
    const msAgo = Date.now() - startedAt
    let timeText = ''

    if (format) {
      if (msAgo < ms('1 minute')) {
        timeText = i18n['seconds-ago'][lang]
      } else if (msAgo < ms('3 minutes')) {
        timeText = i18n['a-minute-ago'][lang]
      } else {
        timeText = ms((Date.now() - startedAt), { long: true })
      }
    } else {
      timeText = ms((Date.now() - startedAt), { long: true })
    }

    // Use the supplied phrase
    if (phrase) {
      return phrase.replace('{time}', timeText)
    }
    // Use default phrase
    else {
      return timeText
    }
  }

  /**
   * Rerender every second.
   */
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000)
    setNow(new Date())
    return () => clearInterval(intervalId)
  }, [])

  return (
    <p className={clsx(className)} title={title}>
      {formatText()}
    </p>
  )
}

export default TimeCounter
