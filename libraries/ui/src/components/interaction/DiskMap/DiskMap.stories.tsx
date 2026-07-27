import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import type { Meta } from '@storybook/react'

import { appActions } from '../../../store/slices/app'

import DiskMap from './DiskMap'
import type { DiskMapBlock } from './layout'

const meta = {
  title: 'Interaction/DiskMap',
  component: DiskMap,
  argTypes: {},
} satisfies Meta<typeof DiskMap>

export default meta

const PALETTE = ['#e5484d', '#f5a524', '#30a46c', '#3e7bfa', '#8e4ec6']

/*
  Modelled on a real library: five Animals as Leaders releases where only the newest is a
  FLAC rip. It is 9 of 55 tracks but a third of the bytes, which is the whole reason this
  component exists — the picture says it before any number does.
*/
const DISCOGRAPHY: { title: string, tracks: number, bytesPerTrack: number, lossless: boolean }[] = [
  { title: 'Parrhesia', tracks: 9, bytesPerTrack: 29_770_096, lossless: true },
  { title: 'The Madness of Many', tracks: 10, bytesPerTrack: 12_970_000, lossless: false },
  { title: 'The Joy of Motion', tracks: 12, bytesPerTrack: 11_266_666, lossless: false },
  { title: 'Weightless', tracks: 12, bytesPerTrack: 10_250_000, lossless: false },
  { title: 'Animals as Leaders', tracks: 12, bytesPerTrack: 10_450_000, lossless: false },
]

const buildBlocks = (
  releases: typeof DISCOGRAPHY,
  jitter = 0.25,
): DiskMapBlock[] => releases.flatMap((release) => (
  Array.from({ length: release.tracks }, (_, index) => ({
    id: `${release.title}-${index}`,
    groupId: release.title,
    groupLabel: release.title,
    label: `Track ${index + 1}`,
    // Real track sizes vary within an album, so the runs shouldn't look machine-cut
    bytes: Math.round(release.bytesPerTrack * (1 - jitter / 2 + ((index % 5) / 4) * jitter)),
    details: release.lossless ? ['04:12', 'FLAC 16-bit/44.1 kHz'] : ['03:48', 'MP3 320 kbps'],
    lossless: release.lossless,
  }))
))

// Stands in for real artwork, so the hover popout has something to show
const fakeCover = (color: string, initial: string) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">`
  + `<rect width="160" height="160" fill="${color}"/>`
  + `<text x="80" y="106" font-size="72" text-anchor="middle" font-family="sans-serif"`
  + ` fill="rgba(255,255,255,0.85)">${initial}</text></svg>`,
)}`

const buildCovers = (releases: typeof DISCOGRAPHY): Record<string, string> => Object.fromEntries(
  releases.map((release, index) => [
    release.title,
    fakeCover(PALETTE[index % PALETTE.length], release.title.slice(0, 1)),
  ]),
)

export const FiveReleases = () => (
  <DiskMap blocks={buildBlocks(DISCOGRAPHY)} palette={PALETTE} groupImages={buildCovers(DISCOGRAPHY)} />
)

export const OneRelease = () => (
  <DiskMap blocks={buildBlocks(DISCOGRAPHY.slice(0, 1))} palette={PALETTE} />
)

export const TwoReleases = () => (
  <DiskMap blocks={buildBlocks(DISCOGRAPHY.slice(0, 2))} palette={PALETTE} />
)

/**
 * The size the component has to survive: a discography as deep as Iron Maiden's
 * with the live albums and compilations counted in. The frame is the same 400x600
 * as every other story here — only the boxes get smaller.
 */
export const ThousandTracks = () => {
  const many = Array.from({ length: 42 }, (_, index) => ({
    title: `Release ${index + 1}`,
    tracks: index % 3 === 0 ? 48 : 13 + (index % 6),
    bytesPerTrack: 8_000_000 + (index % 6) * 3_000_000,
    lossless: index % 7 === 0,
  }))
  const blocks = buildBlocks(many)

  return (
    <>
      <p style={{ marginBottom: 12 }}>{blocks.length} tracks across {many.length} releases</p>
      <DiskMap blocks={blocks} palette={PALETTE} />
    </>
  )
}

/**
 * Thirty two minute hardcore tracks next to one eighteen minute closer, which is
 * what the minimum box size exists for.
 */
export const LopsidedSizes = () => (
  <DiskMap
    palette={PALETTE}
    blocks={[
      ...Array.from({ length: 30 }, (_, index) => ({
        id: `short-${index}`,
        groupId: 'Short',
        groupLabel: 'Damaged',
        label: `Track ${index + 1}`,
        bytes: 1_400_000 + (index % 4) * 200_000,
        details: ['01:12', 'MP3 320 kbps'],
      })),
      {
        id: 'epic',
        groupId: 'Long',
        groupLabel: 'Ambient Works',
        label: 'The Long One',
        bytes: 190_000_000,
        details: ['18:04', 'FLAC 24-bit/96 kHz'],
        lossless: true,
      },
    ]}
  />
)

/**
 * On a narrow screen the map takes the full width of whatever holds it, and the
 * boxes re-pack to suit the new proportions.
 */
export const FullWidth = () => (
  <div style={{ width: '100%' }}>
    <style>{'.full-width-disk-map { width: 100%; }'}</style>
    <DiskMap className="full-width-disk-map" blocks={buildBlocks(DISCOGRAPHY)} palette={PALETTE} />
  </div>
)

/**
 * Hovering a release outside the map lights up its band inside it.
 */
export const LinkedHighlight = () => {
  const [activeGroupId, setActiveGroupId] = useState<string>()

  return (
    <>
      <DiskMap
        blocks={buildBlocks(DISCOGRAPHY)}
        palette={PALETTE}
        groupImages={buildCovers(DISCOGRAPHY)}
        activeGroupId={activeGroupId}
      />
      <ul style={{ marginTop: 16, listStyle: 'none' }}>
        {DISCOGRAPHY.map((release, index) => (
          <li
            key={release.title}
            style={{ padding: '4px 0', color: PALETTE[index % PALETTE.length], cursor: 'default' }}
            onMouseEnter={() => setActiveGroupId(release.title)}
            onMouseLeave={() => setActiveGroupId(undefined)}
          >
            {release.title}
          </li>
        ))}
      </ul>
    </>
  )
}

export const NoAnimation = () => (
  <DiskMap blocks={buildBlocks(DISCOGRAPHY)} palette={PALETTE} animate={false} />
)

/**
 * An artist whose files have not been indexed yet.
 */
export const Empty = () => (
  <DiskMap blocks={[]} palette={PALETTE} />
)

/**
 * A kiosk server has no files behind its library, so whatever blocks are handed
 * over are ignored in favour of a dead grid.
 */
export const KioskMode = () => {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(appActions.setKioskMode(true))

    return () => {
      dispatch(appActions.setKioskMode(false))
    }
  }, [])

  return <DiskMap blocks={buildBlocks(DISCOGRAPHY)} palette={PALETTE} />
}
