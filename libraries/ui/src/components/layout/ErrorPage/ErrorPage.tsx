import { useSelector } from 'react-redux'

import AppPage from '../../features/AppBase/AppPage'

import { settingsSelectors } from '../../../store/slices/settings'
import { PAGE_LAYOUT } from '../../../store/slices/layout'

import i18n from './i18n'

import './ErrorPage.css'

type ErrorLevels = 'page' | 'component'

type StringList = {
  name?: string,
  code?: number,
  message?: string,
}

export type ErrorObject = {
  status?: number,
  error?: string,
  data?: {
    error: string,
    statusCode: number,
    message: string,
  },
}

type ErrorPageProps = {
  level?: ErrorLevels,
  networkError?: ErrorObject,
  overrides?: StringList,
}

const ErrorPage = ({
  level = 'page',
  networkError: error,
  overrides,
}: ErrorPageProps) => {
  const { lang } = useSelector(settingsSelectors.current)

  const getStrings = (): StringList => {
    let defaults = { name: '', message: '' }
    if (error?.status === 404 || overrides?.code === 404) {
      defaults = {
        name: i18n['error-page.404.name'][lang],
        message: i18n['error-page.404.message'][lang],
      }
    }
    return {
      name: overrides?.name || error?.data?.error || defaults.name,
      code: overrides?.code || error?.status,
      message: overrides?.message || error?.data?.message || error?.error || defaults.message,
    }
  }

  const strings = getStrings()

  const wrapper = (content) => {
    if (level === 'page') {
      return (
        <AppPage
          className="error-page"
          layout={PAGE_LAYOUT.fixed}
        >
          {content}
        </AppPage>
      )
    } else if (level === 'component') {
      return (
        <div
          className="component-error"
        >
          {content}
        </div>
      )
    }
  }

  return wrapper(
    <>
      <div className="error-information">
        <p className="error-name">
          {!!strings?.code && <span className="error-code">[{strings?.code}] </span>}
          {strings?.name}
        </p>
        {!!strings?.message && <div className="error-message" dangerouslySetInnerHTML={{ __html: strings?.message }} />}
      </div>
    </>,
  )
}

export default ErrorPage
