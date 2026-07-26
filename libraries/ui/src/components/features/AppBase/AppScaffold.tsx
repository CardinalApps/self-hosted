import { useContext, useRef } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import type { TargetAndTransition } from 'framer-motion'

import SidebarNav from '../../interaction/SidebarNav'
import { MiniAudioPlayer } from '../AudioPlayer'
import PlaybackSidebar from '../PlaybackSidebar'
import { DirectoryTreeSidebarPortal, DirectoryTreeMobileButton } from '../../interaction/DirectoryTree'

import { layoutSelectors } from '../../../store/slices/layout'
import { PAGE_LAYOUT } from '../../../store/slices/layout'
import { settingsSelectors } from '../../../store/slices/settings'
import { RouterContext } from '../../../context/router'
import AccessError from '../../layout/AccessError'
import { useAppSelector } from '../../../hooks/useAppSelector'

export type SidebarOptions = {
  overflow: boolean,
  navigation: ReactNode,
}

type AppScaffoldProps = {
  header: ReactNode,
  sidebarOptions: SidebarOptions,
  privateScaffoldRoutes: ReactNode,
  enableGlobalAudioPlayer?: boolean,
  playbackSidebar?: ReactNode,
}

function AppScaffold({
  header,
  sidebarOptions,
  privateScaffoldRoutes,
  enableGlobalAudioPlayer = false,
  playbackSidebar,
}: PropsWithChildren<AppScaffoldProps>) {
  const { Routes, Route } = useContext(RouterContext)
  const pageScrollRef = useRef(null)
  const mobileNavIsOpen = useAppSelector(layoutSelectors.mobileNavIsOpen)
  const layout = useAppSelector(layoutSelectors.current)
  const mobileFileBrowserIsOpen = useAppSelector(layoutSelectors.mobileFileBrowserIsOpen)
  const playbackSidebarOpen = useAppSelector(layoutSelectors.playbackSidebarOpen)
  const { floating_playback_sidebar } = useAppSelector(settingsSelectors.current)

  // The playback sidebar carries a full sized player, so the mini player stands down while it's open
  const showMiniAudioPlayer = !!enableGlobalAudioPlayer && !(playbackSidebarOpen && playbackSidebar)

  // Docked (not floating) is the only mode that reserves a column, so it's the only one that needs
  // the main column and header to ease over. Driven with the sidebar's own spring so the two pair up.
  const dockedPlaybackSidebar = playbackSidebarOpen && !!playbackSidebar && !floating_playback_sidebar

  return (
    <motion.div
      className={clsx('scaffold')}
      data-layout={layout}
      data-playback-sidebar={playbackSidebarOpen && playbackSidebar ? (floating_playback_sidebar ? 'floating' : 'docked') : 'closed'}
      initial={false}
      animate={{ '--docked-progress': dockedPlaybackSidebar ? 1 : 0 } as TargetAndTransition}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
    >
      {header}
      <div className={clsx('sidebar-nav-col')}>
        <SidebarNav overflow={sidebarOptions?.overflow} mobileHeaderPortal>
          {sidebarOptions?.navigation}
        </SidebarNav>
      </div>
      <div className={clsx('sidebar-bottom')}>
        {/* The mini player hands over to the playback sidebar, so it fades rather than blinking out */}
        <AnimatePresence>
          {!!showMiniAudioPlayer && (
            <motion.div
              key="mini-audio-player"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <MiniAudioPlayer />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <DirectoryTreeSidebarPortal />
      <section
        ref={pageScrollRef}
        className={clsx('main-col', !!mobileNavIsOpen && 'mobile-menu-open')}
      >
        <main className={clsx('page-content', !!mobileFileBrowserIsOpen && 'no-scroll')}>
          {layout === PAGE_LAYOUT.files && <DirectoryTreeMobileButton />}
          <Routes>
            {privateScaffoldRoutes ? privateScaffoldRoutes : null}
            {/* Top-level page error handling */}
            <Route path="*" element={<AccessError code={404} />} />
          </Routes>
        </main>
      </section>
      <PlaybackSidebar contents={playbackSidebar} />
    </motion.div>
  )
}

export default AppScaffold
