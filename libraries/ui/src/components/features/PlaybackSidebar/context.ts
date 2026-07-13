import { createContext, useContext } from 'react'

export type PlaybackSidebarContextType = {
  /**
   * Lets the app-specific contents (an AudioPlayer today, a VideoPlayer later)
   * hand its artwork colors up to the sidebar, which paints them behind
   * everything when glass mode is on.
   */
  setGlassColors: (colors: string[]) => void,
}

export const PlaybackSidebarContext = createContext<PlaybackSidebarContextType>({
  setGlassColors: () => {},
})

// Read the sidebar's context from within its contents
export const usePlaybackSidebar = () => useContext(PlaybackSidebarContext)
