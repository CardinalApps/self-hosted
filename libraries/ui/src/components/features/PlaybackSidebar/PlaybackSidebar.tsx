import { useCallback, useState } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'

import AnimatedGradient from '../../layout/AnimatedGradient'

import { useAppSelector } from '../../../hooks/useAppSelector'
import { layoutSelectors } from '../../../store/slices/layout'
import { settingsSelectors } from '../../../store/slices/settings'
import { getContrastTextColor } from '../../../lib/color/getContrastTextColor'

import { PlaybackSidebarContext } from './context'

import './PlaybackSidebar.css'

type PlaybackSidebarProps = {
  contents: ReactNode,
}

/**
 * The generic wrapper around an app's playback UI. Each media app fills it with
 * its own contents: Music uses an AudioPlayer and a PlaybackQueue, Cinema will
 * use a VideoPlayer, and so on.
 */
const PlaybackSidebar = ({ contents }: PropsWithChildren<PlaybackSidebarProps>) => {
  const open = useAppSelector(layoutSelectors.playbackSidebarOpen)
  const { enable_glass } = useAppSelector(settingsSelectors.current)
  const [glassColors, setGlassColors] = useState<string[]>([])

  // Memoized so that contents can safely depend on it in an effect
  const publishGlassColors = useCallback((colors: string[]) => {
    setGlassColors(colors)
  }, [])

  /*
    The whole sidebar is painted with the artwork's colors, so a dark album leaves the
    theme's text colors unreadable. The contrast is decided once, here, rather than in
    each piece of the contents.
  */
  const contrast = enable_glass && glassColors.length > 0
    ? getContrastTextColor(glassColors)
    : undefined

  if (!contents) {
    return null
  }

  return (
    <PlaybackSidebarContext.Provider value={{ setGlassColors: publishGlassColors }}>
      <AnimatePresence>
        {!!open && (
          <motion.aside
            key="playback-sidebar"
            className={clsx('playback-sidebar', enable_glass && 'glass-enabled')}
            data-contrast={contrast}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="playback-sidebar-content">
              {contents}
            </div>
            {!!enable_glass && <AnimatedGradient values={glassColors} />}
          </motion.aside>
        )}
      </AnimatePresence>
    </PlaybackSidebarContext.Provider>
  )
}

export default PlaybackSidebar
