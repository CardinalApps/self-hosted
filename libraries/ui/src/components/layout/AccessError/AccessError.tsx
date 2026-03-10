import { useSelector } from 'react-redux'
import { MediaServerCapability } from '@cardinalapps/access-control/src'

import { settingsSelectors } from '../../../store/slices/settings'

import i18n from './i18n'

import './AccessError.css'

type StringList = {
  code: number,
  name?: string,
  message?: string,
}

export type NetworkError = {
  status?: number,
  error?: string,
  data?: {
    error: string,
    statusCode: number,
    message: string,
  },
}

type ErrorPageProps = {
  code?: 403 | 404,
  networkError?: NetworkError,
  overrides?: StringList,
  capabilities?: MediaServerCapability[],
}

/**
 * Use either:
 * 
 * - `code` - Use just a code for simple generic strings.
 * - `networkError` - Give a RTK error object to use the strings in it.
 * 
 * Then, override parts of the error with the `overrides` prop, if necessary.
 */
const AccessError = ({
  code,
  networkError,
  overrides,
  capabilities,
}: ErrorPageProps) => {
  const { lang } = useSelector(settingsSelectors.current)

  const getStrings = (): StringList => {
    let defaults = { name: '', message: '', code: 0 }
    const resolvedCode = code || networkError?.status

    if (resolvedCode) {
      defaults = {
        code: resolvedCode,
        name: i18n?.[`access-error.${code}.name`]?.[lang],
        message: i18n?.[`access-error.${code}.message`]?.[lang],
      }
    } else {
      defaults = {
        code: null,
        name: i18n?.[`access-error.fallback.name`]?.[lang],
        message: i18n?.[`access-error.fallback.message`]?.[lang],
      }
    }

    return {
      name: overrides?.name || networkError?.data?.error || defaults.name,
      code: overrides?.code || code || networkError?.status || defaults.code,
      message: overrides?.message || networkError?.data?.message || networkError?.error || defaults.message,
    }
  }

  const strings = getStrings()

  return (
    <div className="access-error">
      <div className="error-information">
        <p className="error-name">
          {!!strings?.code && <span className="error-code">[{strings?.code}] </span>}
          {strings?.name}
        </p>
        {!!strings?.message && <div className="error-message" dangerouslySetInnerHTML={{ __html: strings?.message }} />}
        {!!capabilities?.length && (
          <div className="error-message">
            <p>{i18n['access-error.capabilities-prefix'][lang]} {capabilities.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AccessError
