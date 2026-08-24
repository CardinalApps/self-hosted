import { parseKioskPath, buildKioskEmbeddedMetadata, buildKioskReleaseDate } from './indexing.music-kiosk'

describe('Kiosk path parsing', () => {
  it('reads a leading track number and cleans the title (demo seed layout)', () => {
    const parsed = parseKioskPath('/music/Classical/Berlin Chamber Orchestra/Symphony No. 4/03 Allegro con brio.mp3')
    expect(parsed.artistName).toBe('Berlin Chamber Orchestra')
    expect(parsed.releaseName).toBe('Symphony No. 4')
    expect(parsed.trackName).toBe('Allegro con brio')
    expect(parsed.trackNumber).toBe(3)
  })

  it('still reads a trailing numeric segment (large seed layout)', () => {
    const parsed = parseKioskPath('/kiosk/artist-1/artist-1-release-1/artist-1-release-1-track-7.mp3')
    expect(parsed.trackNumber).toBe(7)
    expect(parsed.trackName).toBe('artist-1-release-1-track-7')
  })

  it('defaults to track 1 when there is no number', () => {
    expect(parseKioskPath('/music/A/B/Intro.mp3').trackNumber).toBe(1)
  })

  it('feeds the cleaned title and number into the fabricated metadata', () => {
    const meta = buildKioskEmbeddedMetadata('/music/Contemporary/Neon Harbor/Golden Hour/01 Ghost Lights.mp3') as {
      title: string, artist: string, album: string, track: { no: number },
    }
    expect(meta.title).toBe('Ghost Lights')
    expect(meta.artist).toBe('Neon Harbor')
    expect(meta.album).toBe('Golden Hour')
    expect(meta.track.no).toBe(1)
  })
})

describe('Kiosk release dates', () => {
  it('lands within the 35-year spread and formats a valid date', () => {
    const currentYear = new Date().getFullYear()
    const { year, date } = buildKioskReleaseDate('Neon Harbor', 'Golden Hour')
    expect(year).toBeGreaterThanOrEqual(currentYear - 34)
    expect(year).toBeLessThanOrEqual(currentYear)
    expect(date).toMatch(new RegExp(`^${year}-(0[1-9]|1[0-2])-(0[1-9]|1\\d|2[0-8])$`))
  })

  it('gives every track of a release the same date', () => {
    const a = buildKioskEmbeddedMetadata('/music/Contemporary/Neon Harbor/Golden Hour/01 Ghost Lights.mp3')
    const b = buildKioskEmbeddedMetadata('/music/Contemporary/Neon Harbor/Golden Hour/09 Paper Trails.mp3')
    expect(a.year).toBe(b.year)
    expect(a.date).toBe(b.date)
  })

  it('spreads different releases across different years', () => {
    const albums = [
      'Golden Hour',
      'Static Bloom',
      'Midnight Weather',
      'Winter Anthems',
      'Endless Season',
      'Velvet Distance',
      'Slow Currents',
      'Neon Interiors',
      'Pale Horizons',
      'Amber Nights',
    ]
    const years = new Set(albums.map((album) => buildKioskReleaseDate('Neon Harbor', album).year))
    expect(years.size).toBeGreaterThan(3)
  })
})
