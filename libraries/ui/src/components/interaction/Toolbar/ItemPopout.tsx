import { useEffect, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

import useClickOutside from '../../../hooks/useClickOutside'

type ItemPopoutProps = {
  className?: string,
  onClose?: () => void,
}

/**
 * The menu that can pop out from some toolbar items.
 */
const ItemPopout = ({
  children,
  onClose,
  ...props
}: PropsWithChildren<ItemPopoutProps>) => {
  const ref = useRef(null)
  const { clickedOutside } = useClickOutside(ref)

  useEffect(() => {
    if (clickedOutside && onClose) {
      onClose()
    }
  }, [clickedOutside])

  return (
    <motion.div
      initial={{ translateY: -4, opacity: 0 }}
      animate={{ translateY: 0, opacity: 1, transition: { duration: 0.2 } }}
      {...props}
      className={clsx('popout', props?.className)}
      ref={ref}
    >
      <div>
        {children}
      </div>
    </motion.div>
  )
}

export default ItemPopout
