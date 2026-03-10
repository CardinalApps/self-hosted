import { useState } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import { useSelector } from 'react-redux'

import H3 from '../../typography/H3'
import WrittenText from '../../typography/WrittenText'
import Modal from '../../layout/Modal'
import Icon from '../../typography/Icon'
import Button from '../Button'
import TextInput from '../../forms/TextInput'

import { settingsSelectors } from '../../../store/slices/settings'

import i18n from './i18n'

import './Confirm.css'

type ConfirmProps = {
  title?: string,
  message?: string | ReactNode,
  mustEnterText?: string,
  loading?: boolean,
  confirmButtonIsDangerous?: boolean,
  onClose?: (confirmed: boolean) => void,
}

/**
 * Confirmation dialogue.
 * 
 * Once the user confirms their intent, `loading` can be set to true while async
 * operations run until the modal is unmounted.
 */
const Confirm = ({
  title,
  message,
  mustEnterText,
  loading = false,
  confirmButtonIsDangerous,
  onClose = () => {},
}: PropsWithChildren<ConfirmProps>) => {
  const { lang } = useSelector(settingsSelectors.current)
  const [enteredText, setEnteredText] = useState('')

  const maybeClose = (confirmed: boolean) => {
    if (loading) {
      return
    }

    if (!mustEnterText) {
      return onClose(confirmed)
    }

    if (mustEnterText && enteredText === mustEnterText && confirmed) {
      return onClose(true)
    } else if (mustEnterText && enteredText !== mustEnterText) {
      if (!confirmed) {
        return onClose(false)
      }
    }
  }

  return (
    <Modal onClose={() => maybeClose(false)} canClose={!loading}>
      <div className="confirmation-dialogue">
        <H3>{title || i18n['confirm.defaults.title'][lang]}</H3>
        <WrittenText>
          {message || i18n['confirm.defaults.message'][lang]}
        </WrittenText>
        {!!mustEnterText &&
          <div className="confirmation-text">
            <p className="confirmation-text-title">
              <Icon fa="fas fa-exclamation-circle" />
              <span dangerouslySetInnerHTML={{ __html: i18n['confirm.enter-text'][lang].replace('{text}', mustEnterText) }} />
            </p>
            <TextInput onChange={(v) => setEnteredText(v)} />
          </div>
        }
        <div className="confirmation-dialogue-controls">
          <Button textual onClick={() => maybeClose(false)}>{i18n['confirm.button.cancel'][lang]}</Button>
          <Button
            textual
            disabled={loading}
            animation={loading ? 'loading' : undefined}
            color={confirmButtonIsDangerous ? 'danger' : undefined}
            onClick={() => maybeClose(true)}
          >
            {i18n['confirm.button.confirm'][lang]}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default Confirm
