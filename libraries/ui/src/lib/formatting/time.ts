import ms from 'ms'
import formatDistanceToNowStrict from 'date-fns/formatDistanceToNowStrict'

import i18n from './i18n'

export type TimeAgoMode = 'activity' | 'exact'

/*
 * Returns a string like "1 minute ago" or "4 hours ago". In 'activity' mode the last minute collapses into a presence
 * label, which suits "is this person around right now" but lies about finished events; 'exact' always reports the
 * real distance.
 */
export const formatTimeAgo = (timeString, lang = 'en', mode: TimeAgoMode = 'activity') => {
  const date = new Date(timeString)
  const msAgo = Date.now() - date.getTime()

  if (mode === 'activity' && msAgo < ms('1 minute')) {
    return i18n['time.less-than-a-minute-ago'][lang]
  } else {
    return `${formatDistanceToNowStrict(date)} ${i18n['time.ago'][lang]}`
  }
}

export const formatTimeUntil = (timeString) => {
  return formatDistanceToNowStrict(new Date(timeString))
}

export const secondsToMMSS = (seconds) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${h ? h.toString().padStart(2, '0') : ''}${m ? m.toString().padStart(2, '0') : '00'}:${s ? s.toString().padStart(2, '0') : '00'}`
}

export const formatDate = (date: string) => {
  return new Date(date).toLocaleString()
}
