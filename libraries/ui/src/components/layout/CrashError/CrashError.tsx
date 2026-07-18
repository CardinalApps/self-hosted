import i18n from './i18n'

import crashImage from '../../../../public/crash.jpg'

import './CrashError.css'

/**
 * Fallback UI for error boundaries. Rendered in place of a React subtree that has
 * crashed, so it must not depend on the store, the router, or anything else that
 * may be the reason the subtree crashed.
 */
const CrashError = () => {
  return (
    <div className="crash-error">
      <img src={crashImage} alt={i18n['crash-error.img-alt']['en']} />
      <p>{i18n['crash-error.message']['en']}</p>
    </div>
  )
}

export default CrashError
