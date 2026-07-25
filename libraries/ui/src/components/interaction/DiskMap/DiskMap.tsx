import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import Card from '../../layout/Card'
import Tags from '../Tags'
import { RouterContext } from '../../../context/router'
import useElementSize from '../../../hooks/useElementSize'
import { settingsSelectors } from '../../../store/slices/settings'

import { buildGroupColors, formatBytes, layoutDiskMap, type DiskMapBlock } from './layout'

import i18n from './i18n'

import './DiskMap.css'

export type { DiskMapBlock }

type DiskMapProps = {
  blocks: DiskMapBlock[]
  /** One color per group, assigned in order of first appearance. Repeats when short. */
  palette?: string[]
  /** Sweeps the blocks in on mount, like a disk scan. Ignored under prefers-reduced-motion. */
  animate?: boolean
  /** Lights up a whole group, for hovering something outside the map. */
  activeGroupId?: string
  /** Where clicking a block navigates to, keyed by groupId. */
  groupLinks?: Record<string, string>
  onBlockClick?: (block: DiskMapBlock) => void
  className?: string
  /** Overrides the summary line announced to assistive tech and shown as the fallback title. */
  ariaLabel?: string
}

/* The map's frame never grows, so a big library means smaller boxes. Below about this many
   pixels a side a box stops reading as a box, so it is given this much whatever its size. */
const MIN_BLOCK_PX = 4

// Used until the frame has been measured, and matches the CSS default
const DEFAULT_FRAME = { width: 400, height: 600 }

/* The packing only has to be redone when the frame changes shape, not on every pixel of a
   window drag, so the measurements it keys off are rounded first. */
const FRAME_STEP_PX = 10

/* How long the mount sweep takes to cross the whole map: the last box's delay plus its own
   animation. After this the sweep is switched off, which leaves the animation property free
   for the hover wiggle — while both are live, hovering cancels the sweep and unhovering
   restarts it, so a box fades out and back in instead of wiggling. */
const SWEEP_MS = 800

/*
  Blocks in a group share one color, so without this a single-release map is a flat slab of
  one hue. Walking a short cycle of near-identical brightnesses per block keeps the
  individual files legible as texture while still holding together as one band. Five steps
  so no two neighbours match and the repeat is long enough not to look striped.
*/
const SHADE_STEPS = [1, 0.91, 1.07, 0.96, 1.03]

/**
 * Draws a set of files the way a defragmenter draws a disk: one box per file,
 * sized by its bytes, laid out in order so that files of the same group form a
 * contiguous band of one color.
 *
 * The point is that area means something — a lossless album visibly dwarfs the
 * lossy ones it sits next to, without a single number on screen. The frame is a
 * fixed size, so 60 tracks and 1,200 tracks both fill exactly the same box.
 */
const DiskMap = ({
  blocks,
  palette = [],
  animate = true,
  activeGroupId,
  groupLinks,
  onBlockClick,
  className,
  ariaLabel,
}: DiskMapProps) => {
  const { navigate } = useContext(RouterContext)
  const { lang, enable_glass } = useSelector(settingsSelectors.current)
  const frameRef = useRef<HTMLDivElement>(null)
  const { width, height } = useElementSize(frameRef)
  const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null)
  const [sweeping, setSweeping] = useState(animate)

  useEffect(() => {
    if (!animate) {
      return
    }

    setSweeping(true)
    const timer = setTimeout(() => setSweeping(false), SWEEP_MS)

    return () => clearTimeout(timer)
  }, [animate, blocks])

  const step = (value: number) => Math.round(value / FRAME_STEP_PX) * FRAME_STEP_PX
  const frameWidth = width > 0 ? step(width) : DEFAULT_FRAME.width
  const frameHeight = height > 0 ? step(height) : DEFAULT_FRAME.height

  const rects = useMemo(
    () => layoutDiskMap(blocks, { width: frameWidth, height: frameHeight, minBlockPx: MIN_BLOCK_PX }),
    [blocks, frameWidth, frameHeight],
  )
  const groupColors = useMemo(() => buildGroupColors(blocks, palette), [blocks, palette])

  const totalBytes = useMemo(
    () => blocks.reduce((sum, block) => sum + Math.max(0, block.bytes || 0), 0),
    [blocks],
  )

  // Each block's shade, by its position within its own group
  const blockShades = useMemo(() => {
    const countsByGroup = new Map<string, number>()

    return blocks.map((block) => {
      const ordinal = countsByGroup.get(block.groupId) ?? 0
      countsByGroup.set(block.groupId, ordinal + 1)
      return SHADE_STEPS[ordinal % SHADE_STEPS.length]
    })
  }, [blocks])

  const hoveredBlock = hoveredBlockIndex === null ? null : blocks[hoveredBlockIndex]
  const hoveredRect = hoveredBlockIndex === null ? null : rects[hoveredBlockIndex]
  const numGroups = groupColors.size || new Set(blocks.map((block) => block.groupId)).size

  const summary = ariaLabel ?? i18n['disk-map.summary'][lang]
    .replace('{files}', String(blocks.length))
    .replace('{groups}', String(numGroups))
    .replace('{size}', formatBytes(totalBytes))

  /*
    The tooltip sits in the half of the map the cursor isn't in, rather than next to the box it
    describes. At this size a tooltip that follows the cursor covers the very band you're
    reading, and near an edge it wants to escape the card the map sits in.
  */
  const tooltipAtBottom = !!hoveredRect && hoveredRect.y + hoveredRect.height / 2 < 0.5

  const hoveredLink = hoveredBlock ? groupLinks?.[hoveredBlock.groupId] : undefined

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Modified clicks are the browser's to handle, so open-in-new-tab still works
    if (!hoveredLink || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return
    }

    event.preventDefault()
    navigate(hoveredLink)
  }

  return (
    <div
      ref={frameRef}
      className={clsx(
        'disk-map',
        animate && sweeping && 'animate',
        (onBlockClick || groupLinks) && 'is-clickable',
        !rects.length && 'disk-map-empty',
        className,
      )}
      title={rects.length ? summary : undefined}
    >
      {!rects.length && <div className="checkered" />}

      {/*
        One anchor that always renders, rather than a wrapper that appears on hover: giving the
        boxes a new parent remounts every one of them and replays the fill animation each time.

        The boxes carry no semantics of their own — they're one picture of the blocks, which is
        what the label describes. Callers put the same data in reachable form next to the map
        (the artist page pairs it with its release list), so this stays out of the tab order
        rather than adding hundreds of stops.
      */}
      <a className="disk-map-link" href={hoveredLink} tabIndex={-1} onClick={handleLinkClick}>
        <div
          className={clsx('disk-map-blocks', activeGroupId && 'has-highlight')}
          role="img"
          aria-label={summary}
          onMouseLeave={() => setHoveredBlockIndex(null)}
        >
          {rects.map((rect) => {
            const block = blocks[rect.blockIndex]
            const isActiveGroup = !!activeGroupId && block.groupId === activeGroupId

            return (
              <div
                key={block.id || rect.blockIndex}
                className={clsx(
                  'disk-map-block',
                  block.lossless && 'is-lossless',
                  hoveredBlockIndex === rect.blockIndex && 'is-hovered',
                  isActiveGroup && 'is-active-group',
                )}
                /* The shade rides a custom property rather than an inline filter so that the
                   hover and active-group rules can still override it. */
                style={{
                  left: `${rect.x * 100}%`,
                  top: `${rect.y * 100}%`,
                  width: `${rect.width * 100}%`,
                  height: `${rect.height * 100}%`,
                  backgroundColor: groupColors.get(block.groupId),
                  '--disk-map-shade': blockShades[rect.blockIndex],
                  ...(animate ? { animationDelay: `${(rect.blockIndex / rects.length) * 500}ms` } : {}),
                } as React.CSSProperties}
                onMouseEnter={() => setHoveredBlockIndex(rect.blockIndex)}
                onClick={() => onBlockClick?.(block)}
              />
            )
          })}
        </div>
      </a>

      {!!hoveredBlock && (
        <Card
          className={clsx('disk-map-tooltip', tooltipAtBottom ? 'at-bottom' : 'at-top', enable_glass && 'glass')}
          bg={1}
          border={2}
          padding="thin"
        >
          {!!hoveredBlock.label && <p className="disk-map-tooltip-label">{hoveredBlock.label}</p>}

          {!!hoveredBlock.groupLabel && (
            <p className="disk-map-tooltip-group">
              <span
                className="disk-map-tooltip-swatch"
                style={{ backgroundColor: groupColors.get(hoveredBlock.groupId) }}
              />
              {hoveredBlock.groupLabel}
            </p>
          )}

          <Tags size="small" tags={[formatBytes(hoveredBlock.bytes), ...(hoveredBlock.details ?? [])]} />
        </Card>
      )}
    </div>
  )
}

export default DiskMap
