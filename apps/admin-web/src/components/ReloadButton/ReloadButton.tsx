import { useState } from 'react'

import Icon from '@cardinalapps/ui/src/components/typography/Icon'

import './styles.css'

/* Reads that all settle in the same tick would otherwise start and finish the spinner inside one
   render, leaving a click that looks like it did nothing. */
const MIN_BUSY_MS = 400

type ReloadButtonProps = {
  title: string,
  onClick: () => void | Promise<unknown>,
}

// The admin app's one reload affordance; it spins for as long as the work it was given runs
function ReloadButton({ title, onClick }: ReloadButtonProps) {
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    if (busy) {
      return
    }

    setBusy(true)

    try {
      await Promise.all([
        onClick(),
        new Promise((resolve) => setTimeout(resolve, MIN_BUSY_MS)),
      ])
    } catch (error) {
      console.warn('Could not reload.', error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Icon
      className="reload-button"
      fa={busy ? 'fas fa-circle-notch fa-spin' : 'fas fa-redo-alt'}
      title={title}
      onClick={handleClick}
    />
  )
}

export default ReloadButton
