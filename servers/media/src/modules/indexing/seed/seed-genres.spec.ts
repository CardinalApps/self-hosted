import { buildDemoLibraries, countTracks } from './seed-genres'

describe('Seed: genre catalogue', () => {
  it('builds the three genre libraries', () => {
    const libs = buildDemoLibraries()
    expect(libs.map((l) => l.genre)).toEqual(['Classical', 'Contemporary', 'Soundtracks'])
    expect(libs.map((l) => l.dirName)).toEqual(['Classical', 'Contemporary', 'Soundtracks'])
    for (const lib of libs) {
      expect(lib.artists.length).toBeGreaterThan(0)
    }
  })

  it('produces a believable amount of content (~500 tracks by default)', () => {
    const total = countTracks(buildDemoLibraries())
    expect(total).toBeGreaterThan(300)
    expect(total).toBeLessThan(800)
  })

  it('scales the artist counts proportionally', () => {
    const small = buildDemoLibraries(0.2)
    const large = buildDemoLibraries(2)
    const artists = (libs) => libs.reduce((s, l) => s + l.artists.length, 0)
    expect(artists(small)).toBeLessThan(artists(large))
  })

  it('gives every album at least one track with titles unique within the album', () => {
    for (const lib of buildDemoLibraries()) {
      for (const artist of lib.artists) {
        expect(artist.name.length).toBeGreaterThan(0)
        for (const album of artist.albums) {
          expect(album.tracks.length).toBeGreaterThan(0)
          expect(new Set(album.tracks).size).toBe(album.tracks.length)
        }
      }
    }
  })

  it('classical albums use movement-style track titles', () => {
    const classical = buildDemoLibraries().find((l) => l.genre === 'Classical')!
    const anyTrack = classical.artists[0].albums[0].tracks[0]
    // e.g. "I. Allegro con brio"
    expect(anyTrack).toMatch(/^[IVX]+\.\s/)
  })

  it('soundtrack albums are titled as motion picture soundtracks', () => {
    const soundtracks = buildDemoLibraries().find((l) => l.genre === 'Soundtracks')!
    const anyAlbum = soundtracks.artists[0].albums[0].title
    expect(anyAlbum).toContain('(Original Motion Picture Soundtrack)')
  })
})
