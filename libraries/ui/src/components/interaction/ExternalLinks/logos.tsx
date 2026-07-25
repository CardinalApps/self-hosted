import type { ReactNode } from 'react'

import type { ExternalProviderId } from './providers'

/*
  Placeholder monogram marks, not the providers' real logos.

  These are deliberately generic: shipping an approximation of someone else's trademark is
  worse than shipping an obvious stand-in, and the real marks have to be sourced from each
  provider's own brand assets. Drop the official SVG paths in here to replace them - the
  viewBox is 24x24 and the mark should inherit currentColor.
*/

const MusicBrainzLogo = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <text
      x="12"
      y="16.5"
      textAnchor="middle"
      fill="currentColor"
      fontSize="11"
      fontWeight="700"
      fontFamily="inherit"
    >
      MB
    </text>
  </svg>
)

const DiscogsLogo = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <text
      x="12"
      y="8.5"
      textAnchor="middle"
      fill="currentColor"
      fontSize="6"
      fontWeight="700"
      fontFamily="inherit"
    >
      D
    </text>
  </svg>
)

const AmazonLogo = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <text
      x="12"
      y="15.5"
      textAnchor="middle"
      fill="currentColor"
      fontSize="10"
      fontWeight="700"
      fontFamily="inherit"
    >
      A
    </text>
  </svg>
)

export const providerLogos: Record<ExternalProviderId, () => ReactNode> = {
  musicbrainz: MusicBrainzLogo,
  discogs: DiscogsLogo,
  amazon: AmazonLogo,
}

export const providerNames: Record<ExternalProviderId, string> = {
  musicbrainz: 'MusicBrainz',
  discogs: 'Discogs',
  amazon: 'Amazon',
}
