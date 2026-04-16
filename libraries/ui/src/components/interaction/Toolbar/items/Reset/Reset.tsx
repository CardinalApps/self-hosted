import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'

import { settingsSelectors } from '../../../../../store/slices/settings'
import { layoutActions } from '../../../../../store/slices/layout'
import { ToolbarItem, ToolbarItemProps } from '../../types'

import i18n from '../../i18n'

export const SLUG = ToolbarItem.RESET

export type ResetExtra = {
  onReset?: () => void,
}

export type ResetItemProps = ToolbarItemProps & {
  defaultValues?: Record<string, unknown>,
  virtualViewName?: string,
}

const ToolbarReset = ({ toolbarName, item, defaultValues, virtualViewName }: ResetItemProps) => {
  const dispatch = useDispatch()
  const { lang } = useSelector(settingsSelectors.current)
  const [resetIconAnimation, setResetIconAnimation] = useState('')
  const { onReset } = (item?.extra ?? {}) as ResetExtra

  const reset = () => {
    dispatch(layoutActions.setToolbarValues({ name: toolbarName, values: defaultValues }))
    if (virtualViewName) {
      dispatch(layoutActions.resetScrollPoint(virtualViewName))
    }
    onReset?.()
    setResetIconAnimation('spin')
  }

  return (
    <motion.div
      className="reset"
      key={resetIconAnimation}
      initial={{ rotate: 0 }}
      animate={resetIconAnimation ? { rotate: -360 } : {}}
      transition={{ type: 'spring', duration: 0.5 }}
      onAnimationComplete={() => setResetIconAnimation('')}
    >
      <button className="toolbar-button" onClick={reset} title={i18n['reset.title'][lang]}>
        <i className="toolbar-icon fas fa-undo-alt" />
      </button>
    </motion.div>
  )
}

export default ToolbarReset
