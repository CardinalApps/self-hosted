import { useCallback, useMemo, useState } from 'react'
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

/*
  With nothing playing there is no artwork to sample, and the gradient would collapse to a
  flat panel. These greys stand in for it, joined by the user's accent colour so that the
  idle sidebar still belongs to their theme. They sit a shade off each theme's own --bg-1,
  which the gradient paints them onto, so they read as soft cloud rather than as a wash.

  The lightness band has to be wide enough to hold the accent as well as the greys, since
  it applies to every blotch. Each one is pulled back towards its own colour as it drifts,
  so the band only has to stop them wandering out of the theme entirely.
*/
const IDLE_GRADIENT: Record<string, { greys: string[], lightMin: number, lightMax: number }> = {
  light: { greys: ['#ededed', '#e0e0e0', '#f5f5f5'], lightMin: 45, lightMax: 98 },
  dark: { greys: ['#3a3a3a', '#2c2c2c', '#464646'], lightMin: 10, lightMax: 60 },
}

/**
 * The generic wrapper around an app's playback UI. Each media app fills it with
 * its own contents: Music uses an AudioPlayer and a PlaybackQueue, Cinema will
 * use a VideoPlayer, and so on.
 */
const PlaybackSidebar = ({ contents }: PropsWithChildren<PlaybackSidebarProps>) => {
  const open = useAppSelector(layoutSelectors.playbackSidebarOpen)
  const { enable_glass, floating_playback_sidebar, theme, accent_color } = useAppSelector(settingsSelectors.current)
  const [glassColors, setGlassColors] = useState<string[]>([])

  // Memoized so that contents can safely depend on it in an effect
  const publishGlassColors = useCallback((colors: string[]) => {
    setGlassColors(colors)
  }, [])

  // Nothing is playing, or what is playing has no artwork worth sampling
  const idle = glassColors.length === 0
  const idleGradient = IDLE_GRADIENT[theme as string] ?? IDLE_GRADIENT.light

  // Memoized because handing the gradient a fresh array restarts its drift from the top
  const idleColors = useMemo(
    () => [...idleGradient.greys, accent_color as string].filter(Boolean),
    [idleGradient, accent_color],
  )

  /*
    The whole sidebar is painted with the artwork's colors, so a dark album leaves the
    theme's text colors unreadable. The contrast is decided once, here, rather than in
    each piece of the contents.

    The idle greys are drawn from the theme, so the theme's own text colors already suit
    them and nothing needs to be overridden.
  */
  const contrast = enable_glass && !idle
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
            className={clsx('playback-sidebar', enable_glass && 'glass-enabled', floating_playback_sidebar && 'floating')}
            data-contrast={contrast}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="playback-sidebar-card">
              <div className="playback-sidebar-content">
                {contents}
              </div>
              {/* The idle colors fill an otherwise empty sidebar, so they show whether or not glass is on */}
              {!!idle && (
                <AnimatedGradient
                  values={idleColors}
                  dance
                  /*
                    Every blotch is pulled back towards its own colour as it drifts, so with no
                    hue or saturation noise the greys stay grey and the accent stays the accent.
                    Only their lightness and their placement wander.
                  */
                  hueNoise={0}
                  satNoise={0}
                  satMin={0}
                  satMax={100}
                  lightMin={idleGradient.lightMin}
                  lightMax={idleGradient.lightMax}
                />
              )}
              {!idle && !!enable_glass && <AnimatedGradient values={glassColors} />}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </PlaybackSidebarContext.Provider>
  )
}

export default PlaybackSidebar
