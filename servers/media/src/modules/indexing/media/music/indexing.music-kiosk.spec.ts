import { parseKioskPath, buildKioskEmbeddedMetadata } from './indexing.music-kiosk'

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
