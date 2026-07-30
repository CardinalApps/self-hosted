import type { Meta } from '@storybook/react'

import Tags from '../Tags'

import ExternalLinks from './ExternalLinks'

const meta = {
  title: 'Interaction/ExternalLinks',
  component: ExternalLinks,
  argTypes: {},
} satisfies Meta<typeof ExternalLinks>

export default meta

// Real identifiers, read off an Animals as Leaders rip
const ARTIST_IDS = {
  musicbrainzArtistId: '5c2d2520-950b-4c78-84fc-78a9328172a3',
}

const RELEASE_IDS = {
  musicbrainzArtistId: '5c2d2520-950b-4c78-84fc-78a9328172a3',
  musicbrainzReleaseId: 'c3549f65-4cab-4381-a382-61e1d033dd2c',
  musicbrainzReleaseGroupId: '51a74d4a-f21d-49de-8655-5335dafd82d2',
  barcode: '817424013734',
  catalogNumber: 'SUM473',
}

const TRACK_IDS = {
  ...RELEASE_IDS,
  musicbrainzRecordingId: '3fc2f0bb-0f4a-4a5e-9a02-2f79e2b13e6b',
  isrc: 'USA2P1400001',
}

// The popout hangs to the left of its trigger, so the frame keeps room on that side for it
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: 20, paddingLeft: 320, minHeight: 400 }}>{children}</div>
)

/**
 * What the artist page has: one identifier, one link.
 */
export const ArtistOnly = () => (
  <Frame>
    <ExternalLinks ids={ARTIST_IDS} />
  </Frame>
)

/**
 * What a release page has once the printed identifiers are read too.
 */
export const Release = () => (
  <Frame>
    <ExternalLinks ids={RELEASE_IDS} />
  </Frame>
)

/**
 * Everything at once, including the per-recording identifiers.
 */
export const EveryProvider = () => (
  <Frame>
    <ExternalLinks ids={TRACK_IDS} />
  </Frame>
)

/**
 * Files with no external IDs render nothing at all by default, so nothing on
 * the page implies a lookup that isn't available.
 */
export const Empty = () => (
  <Frame>
    <p style={{ marginBottom: 12, fontSize: 13 }}>Nothing renders below this line:</p>
    <ExternalLinks ids={{}} />
  </Frame>
)

/**
 * The same empty case, forced open, for pages that want the affordance to stay
 * put rather than disappear.
 */
export const EmptyShown = () => (
  <Frame>
    <ExternalLinks ids={{}} showWhenEmpty />
  </Frame>
)

/**
 * Where it's used: at the head of a page's row of key stats.
 */
export const InAStatsRow = () => (
  <Frame>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
      <ExternalLinks ids={RELEASE_IDS} />
      <Tags tags={['13 releases', '183 tracks', '2.3 GB']} />
    </div>
  </Frame>
)
