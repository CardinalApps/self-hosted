import { useState, useEffect, PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'

import Button from '../Button'

import { settingsSelectors } from '../../../store/slices/settings'

import i18n from './i18n'

import './CreateSomething.css'

type CreateSomethingProps = {
  initiallyOpen?: boolean,
  onChange?: (value) => void,
  onSubmit?: (value) => void,
  rtkResult?: Record<string, unknown>,
  placeholder?: string,
  fieldLabel?: string,
  submitLabel?: string,
}

/**
 * A big button that prompts the user for the name of something new.
 *
 */
const CreateSomething = ({
  initiallyOpen = false,
  onChange,
  onSubmit,
  rtkResult,
  placeholder,
  fieldLabel,
  submitLabel,
}: PropsWithChildren<CreateSomethingProps>) => {
  const { lang } = useSelector(settingsSelectors.current)
  const [show, setShow] = useState(initiallyOpen)
  const [value, setValue] = useState('')

  /**
   * Handle form submit.
   */
  const handleSubmit = (e) => {
    e.stopPropagation()
    e.preventDefault()

    onSubmit?.(value)
  }

  /**
   * Propagate value on change.
   */
  useEffect(() => {
    onChange?.(value)
  }, [value])

  /**
   * Automaticlly clear after async API call.
   */
  useEffect(() => {
    if (rtkResult?.isSuccess) {
      setValue('')
    }
  }, [rtkResult])

  return (
    <div className="create-something">
      <button type="button" className="create-something-button" onClick={() => setShow(!show)}>
        {
          show
            ? <i className="icon fas fa-minus" />
            : <i className="icon fas fa-plus" />
        }
      </button>
      <AnimatePresence>
        {
          show
            ? <motion.div
                className="create-something-form"
                initial={{ x: -5, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -5, opacity: 0 }}
              >
                <form onSubmit={handleSubmit}>
                  <label>
                    <span className="create-something-text-label">{fieldLabel || i18n['default-field-label'][lang]}</span>
                    <input type="text" name="name" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
                  </label>
                  <Button type="submit">{submitLabel || i18n['default-submit-label'][lang]}</Button>
                </form>
              </motion.div>
            : null
        }
      </AnimatePresence>
    </div>
  )
}

export default CreateSomething

