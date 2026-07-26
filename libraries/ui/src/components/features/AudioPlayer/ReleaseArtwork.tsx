import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

import Icon from '../../typography/Icon'
import Visualizer from '../../graphics/Visualizer/Visualizer'
import {
  asVisualizerVariant,
  nextVisualizerVariant,
  VisualizerVariant,
} from '../../graphics/Visualizer/variants'

import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { useAppSelector } from '../../../hooks/useAppSelector'
import { layoutActions, layoutSelectors } from '../../../store/slices/layout'

/* The outgoing layer clears the square before the incoming one starts arriving, so the two
   never cross-dissolve into a muddle. The incoming layer has already been rendering behind the
   fade-out by the time it is revealed. */
const FADE_OUT_MS = 200
const FADE_IN_MS = 400

// null is the cover art; anything else is the visualizer showing that variant
type Slot = VisualizerVariant | null

type ReleaseArtworkProps = {
  coverSrc?: string,
  hasThumbnails?: boolean,
  // Only the wide player cycles through the visualizers; the mini player is far too small for them
  interactive?: boolean,
  // The element the visualizers analyse, which is the Howl driving this player
  mediaElement?: HTMLMediaElement | null,
}

/**
 * The square in the player that holds the release cover. In the wide player it is also the
 * visualizer: each click advances it to the next one, and past the last one back to the cover.
 */
const ReleaseArtwork = ({ coverSrc, hasThumbnails, interactive, mediaElement }: ReleaseArtworkProps) => {
  const dispatch = useAppDispatch()
  const stored = asVisualizerVariant(useAppSelector(layoutSelectors.playbackVisualizer))

  const [shown, setShown] = useState<Slot>(interactive ? stored : null)
  const [shownReady, setShownReady] = useState(shown === null)
  // undefined means nothing is on its way in; null means the cover is
  const [incoming, setIncoming] = useState<Slot | undefined>(undefined)
  const [incomingReady, setIncomingReady] = useState(false)
  const [fadedOut, setFadedOut] = useState(false)
  const [supported, setSupported] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => clearTimeout(timer.current ?? undefined), [])

  // The incoming layer only takes over once it has both cleared the old one and warmed up
  useEffect(() => {
    if (incoming === undefined || !fadedOut || !incomingReady) {
      return
    }
    setShown(incoming)
    setShownReady(true)
    setIncoming(undefined)
    setIncomingReady(false)
    setFadedOut(false)
    dispatch(layoutActions.setPlaybackVisualizer(incoming))
  }, [incoming, fadedOut, incomingReady, dispatch])

  const handleClick = () => {
    if (!interactive || !supported || incoming !== undefined) {
      return
    }
    const next = nextVisualizerVariant(shown)
    // The cover has nothing to initialize, so it is only ever waiting on the fade-out
    setIncomingReady(next === null)
    setFadedOut(false)
    setIncoming(next)
    timer.current = setTimeout(() => setFadedOut(true), FADE_OUT_MS)
  }

  // A canvas that cannot render at all takes the whole feature down to the cover art
  const handleError = () => {
    clearTimeout(timer.current ?? undefined)
    setSupported(false)
    setIncoming(undefined)
    setShown(null)
    setShownReady(true)
    dispatch(layoutActions.setPlaybackVisualizer(null))
  }

  const layers: Array<{ slot: Slot, arriving: boolean }> = [{ slot: shown, arriving: false }]
  if (incoming !== undefined) {
    layers.push({ slot: incoming, arriving: true })
  }

  return (
    <div
      className={clsx('release-image', !hasThumbnails && 'no-image', interactive && supported && 'interactive')}
      onClick={handleClick}
    >
      {layers.map(({ slot, arriving }) => {
        const leaving = !arriving && incoming !== undefined
        const visible = !arriving && !leaving && shownReady

        return (
          <div
            key={slot ?? 'cover'}
            className={clsx('release-image-layer', visible && 'visible')}
            style={{ transitionDuration: `${leaving ? FADE_OUT_MS : FADE_IN_MS}ms` }}
          >
            {slot === null
              ? (coverSrc ? <img src={coverSrc} /> : <Icon fa="fas fa-music" />)
              : (
                <Visualizer
                  variant={slot}
                  mediaElement={mediaElement}
                  onReady={() => (arriving ? setIncomingReady(true) : setShownReady(true))}
                  onError={handleError}
                />
              )
            }
          </div>
        )
      })}
    </div>
  )
}

export default ReleaseArtwork
