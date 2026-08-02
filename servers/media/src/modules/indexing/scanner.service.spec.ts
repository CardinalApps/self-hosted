import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { ScannerService } from './scanner.service'
import { MediaType } from '../../utils/media'

/**
 * Builds a ScannerService with stubbed Nest dependencies. The scanner only
 * touches the file system in these tests; none of the injected services are
 * exercised by the music scan.
 */
function makeScanner(): ScannerService {
  return new ScannerService(
    {} as never,
    {} as never,
    { isFromGooglePhotos: () => false } as never,
  )
}

/**
 * Wraps file paths in the minimal shape that the glob stream yields, so tests
 * can simulate the walk returning an arbitrary subset of the files on disk.
 */
function globItems(paths: string[]) {
  return paths.map((p) => ({ fullpath: () => p }))
}

async function* streamOf(items: { fullpath: () => string }[]) {
  for (const item of items) {
    yield item
  }
}

async function* brokenStreamOf(items: { fullpath: () => string }[], error: Error) {
  for (const item of items) {
    yield item
  }
  throw error
}

type GlobItemStream = AsyncIterable<{ fullpath: () => string }>

/**
 * Replaces the scanner's glob stream with a canned one, so tests control
 * exactly which files the walk "finds" regardless of what is on disk.
 */
function mockGlobStream(scanner: ScannerService, stream: GlobItemStream) {
  jest.spyOn(
    scanner as unknown as { createMusicGlobStream: () => GlobItemStream },
    'createMusicGlobStream',
  ).mockReturnValue(stream)
}

describe('ScannerService music scan verification', () => {
  let scanner: ScannerService
  let musicDir: string
  let onFileFound: jest.Mock

  const allFiles = [
    'Artists/Against Me!/[2002] Reinventing Axl Rose/01 - Pints of Guinness Make You Strong.mp3',
    'Artists/Against Me!/[2002] Reinventing Axl Rose/02 - Those Anarcho Punks Are Mysterious.mp3',
    'Artists/50 Cent/[2003] Get Rich or Die Tryin/01 - Intro.mp3',
    'Artists/Coldplay/[2000] Parachutes/01 - Don\'t Panic.flac',
    'Artists/Coldplay/[2000] Parachutes/02 - Shiver.flac',
    'Hits/one hit wonder.m4a',
  ]

  const seed = (relativePaths: string[]) => {
    for (const rel of relativePaths) {
      const abs = path.join(musicDir, rel)
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, 'audio')
    }
  }

  const absolute = (rel: string) => path.join(musicDir, rel)

  beforeEach(() => {
    scanner = makeScanner()
    musicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-spec-'))
    process.env.MUSIC_DIR = musicDir
    onFileFound = jest.fn()
    seed(allFiles)
  })

  afterEach(() => {
    delete process.env.MUSIC_DIR
    delete process.env.INDEXING_SCAN_VERIFY_PASSES
    fs.rmSync(musicDir, { recursive: true, force: true })
    jest.restoreAllMocks()
  })

  test('a complete glob walk converges without recovering anything', async () => {
    mockGlobStream(scanner, streamOf(globItems(allFiles.map(absolute))))

    const results = await scanner.scanMusic(onFileFound, new AbortController())

    expect(onFileFound).toHaveBeenCalledTimes(allFiles.length)
    expect(results.musicVerification.converged).toBe(true)
    expect(results.musicVerification.recoveredFiles).toEqual([])
  })

  test('files silently missing from the glob walk are recovered by verification', async () => {
    // Simulates the SMB failure observed in production: the walk returns a
    // partial listing with no error at all
    const partial = allFiles.filter((rel) => !rel.includes('Coldplay'))
    mockGlobStream(scanner, streamOf(globItems(partial.map(absolute))))

    const results = await scanner.scanMusic(onFileFound, new AbortController())

    const foundPaths = onFileFound.mock.calls.map(([p]) => p)
    for (const rel of allFiles) {
      expect(foundPaths).toContain(absolute(rel))
    }
    expect(onFileFound).toHaveBeenCalledTimes(allFiles.length)
    expect(results.musicVerification.converged).toBe(true)
    expect(results.musicVerification.recoveredFiles.sort()).toEqual(
      allFiles.filter((rel) => rel.includes('Coldplay')).map(absolute).sort(),
    )
    expect(onFileFound.mock.calls.every(([, type]) => type === MediaType.MUSIC)).toBe(true)
  })

  test('a glob stream error no longer aborts the scan; the remainder is recovered', async () => {
    const first = allFiles.slice(0, 1)
    mockGlobStream(scanner, brokenStreamOf(globItems(first.map(absolute)), new Error('ECONNRESET')))

    const results = await scanner.scanMusic(onFileFound, new AbortController())

    expect(onFileFound).toHaveBeenCalledTimes(allFiles.length)
    expect(results.musicVerification.converged).toBe(true)
    expect(results.musicVerification.recoveredFiles).toHaveLength(allFiles.length - 1)
  })

  test('verification only recovers supported, non-ignored files', async () => {
    seed([
      'Artists/Coldplay/@eaDir/thumb.mp3',
      'Artists/Coldplay/[2000] Parachutes/cover.jpg',
      'Artists/Coldplay/[2000] Parachutes/notes.txt',
      'Artists/Queen/[1975] A Night at the Opera/01 - Death on Two Legs.MP3',
    ])
    mockGlobStream(scanner, streamOf([]))

    const results = await scanner.scanMusic(onFileFound, new AbortController())

    const foundPaths = onFileFound.mock.calls.map(([p]) => p)
    expect(foundPaths).not.toContain(absolute('Artists/Coldplay/@eaDir/thumb.mp3'))
    expect(foundPaths).not.toContain(absolute('Artists/Coldplay/[2000] Parachutes/cover.jpg'))
    expect(foundPaths).not.toContain(absolute('Artists/Coldplay/[2000] Parachutes/notes.txt'))
    // Extension matching is case-insensitive, like the nocase glob walk
    expect(foundPaths).toContain(absolute('Artists/Queen/[1975] A Night at the Opera/01 - Death on Two Legs.MP3'))
    expect(results.musicVerification.converged).toBe(true)
  })

  test('a directory that fails to list once is retried on the next pass', async () => {
    const failingDir = path.join(musicDir, 'Artists', 'Coldplay')
    const realReaddir = fs.promises.readdir
    let failures = 0
    jest.spyOn(fs.promises, 'readdir').mockImplementation(((dir: never, opts: never) => {
      if (String(dir) === failingDir && failures === 0) {
        failures++
        return Promise.reject(Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' }))
      }
      return realReaddir(dir, opts)
    }) as never)
    mockGlobStream(scanner, streamOf([]))

    const results = await scanner.scanMusic(onFileFound, new AbortController())

    expect(onFileFound).toHaveBeenCalledTimes(allFiles.length)
    expect(results.musicVerification.converged).toBe(true)
    expect(results.musicVerification.unreadableDirs).toEqual([])
  })

  test('a directory that never lists is reported and caps the passes', async () => {
    process.env.INDEXING_SCAN_VERIFY_PASSES = '3'
    const failingDir = path.join(musicDir, 'Artists', 'Coldplay')
    const realReaddir = fs.promises.readdir
    jest.spyOn(fs.promises, 'readdir').mockImplementation(((dir: never, opts: never) => {
      if (String(dir) === failingDir) {
        return Promise.reject(Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' }))
      }
      return realReaddir(dir, opts)
    }) as never)
    mockGlobStream(scanner, streamOf([]))

    const results = await scanner.scanMusic(onFileFound, new AbortController())

    expect(results.musicVerification.converged).toBe(false)
    expect(results.musicVerification.unreadableDirs).toEqual([failingDir])
    expect(results.musicVerification.passes).toBe(3)
    // Everything outside the unreadable directory is still found
    const foundPaths = onFileFound.mock.calls.map(([p]) => p)
    for (const rel of allFiles.filter((r) => !r.includes('Coldplay'))) {
      expect(foundPaths).toContain(absolute(rel))
    }
  })

  test('an aborted scan skips verification', async () => {
    const abortController = new AbortController()
    abortController.abort()
    mockGlobStream(scanner, streamOf([]))

    const results = await scanner.scanMusic(onFileFound, abortController)

    expect(results.musicVerification).toBeUndefined()
  })
})
