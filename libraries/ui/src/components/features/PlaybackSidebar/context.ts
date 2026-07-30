import { createContext, useContext } from 'react'
import type { RefObject } from 'react'

export type PlaybackSidebarContextType = {
  /**
   * Lets the app-specific contents (an AudioPlayer today, a VideoPlayer later)
   * hand its artwork colors up to the sidebar, which paints them behind
   * everything when glass mode is on.
   */
  setGlassColors: (colors: string[]) => void,
  /**
   * The sidebar's scrollable content element. The whole sidebar scrolls as one,
   * so anything inside that virtualizes against the scroll (the queue) reads its
   * offsets from this element rather than scrolling itself.
   */
  scrollRef: RefObject<HTMLDivElement | null>,
}

export const PlaybackSidebarContext = createContext<PlaybackSidebarContextType>({
  setGlassColors: () => {},
  scrollRef: { current: null },
})

// Read the sidebar's context from within its contents
export const usePlaybackSidebar = () => useContext(PlaybackSidebarContext)
