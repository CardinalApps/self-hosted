import { sanitizeSegment, hashString, PALETTE, resolveSampleDir, listSampleFiles, generateCover } from './seed-common'

describe('Seed: common helpers', () => {
  it('strips SMB/Azure-Files-illegal characters from path segments', () => {
    expect(sanitizeSegment('III. Menuetto: Allegretto')).not.toMatch(/[\\/:*?"<>|]/)
    expect(sanitizeSegment('A/B\\C:D*E?F"G<H>I|J')).not.toMatch(/[\\/:*?"<>|]/)
    // legal characters are preserved
    expect(sanitizeSegment('Nocturnes, Op. 9')).toBe('Nocturnes, Op. 9')
    expect(sanitizeSegment('The Film (Original Motion Picture Soundtrack)')).toBe('The Film (Original Motion Picture Soundtrack)')
  })

  it('hashes strings deterministically within the palette range', () => {
    expect(hashString('abc')).toBe(hashString('abc'))
    expect(hashString('abc') % PALETTE.length).toBeGreaterThanOrEqual(0)
    expect(hashString('abc') % PALETTE.length).toBeLessThan(PALETTE.length)
  })

  it('resolves the bundled sample-music directory and its files', () => {
    const dir = resolveSampleDir()
    const files = listSampleFiles(dir)
    expect(files.length).toBeGreaterThan(0)
  })

  it('generates a JPEG cover buffer', async () => {
    const buf = await generateCover('Some Artist', 'Some Album')
    // JPEG magic bytes
    expect(buf[0]).toBe(0xff)
    expect(buf[1]).toBe(0xd8)
  })
})
