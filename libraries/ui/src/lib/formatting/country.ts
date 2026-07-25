import i18n from './i18n'

/*
  MusicBrainz tags releases with a few user-assigned codes that no region table knows about,
  so they have to be named here rather than left to Intl.
*/
const PSEUDO_CODES: Record<string, string> = {
  XW: 'country.worldwide',
  XE: 'country.europe',
  XU: 'country.unknown',
}

const formatters = new Map<string, Intl.DisplayNames>()

// Intl.DisplayNames is expensive to construct, and a page can ask for the same lang many times
const formatter = (lang: string): Intl.DisplayNames | null => {
  if (!formatters.has(lang)) {
    try {
      formatters.set(lang, new Intl.DisplayNames([lang], { type: 'region' }))
    } catch {
      return null
    }
  }

  return formatters.get(lang)
}

// Turns a release country code like "US", or MusicBrainz's "XW", into a readable name
export const countryName = (code: string, lang = 'en'): string => {
  if (!code) {
    return ''
  }

  const upper = code.trim().toUpperCase()
  const pseudoKey = PSEUDO_CODES[upper]

  if (pseudoKey) {
    return i18n[pseudoKey][lang] ?? i18n[pseudoKey]['en']
  }

  try {
    return formatter(lang)?.of(upper) ?? upper
  } catch {
    // An unrecognized code is more useful shown as-is than dropped
    return upper
  }
}
