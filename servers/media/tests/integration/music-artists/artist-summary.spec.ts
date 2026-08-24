import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { RatingMediaType } from '../../../src/modules/rating/rating.entity'
import { MusicArtist } from '../../../src/modules/music-artist/music-artist.entity'
import { MusicRelease } from '../../../src/modules/music-release/music-release.entity'
import { MusicReleaseThumbnail } from '../../../src/modules/music-release/music-release-thumbnail.entity'
import { MusicTrack } from '../../../src/modules/music-track/music-track.entity'
import { MusicTrackMetadata } from '../../../src/modules/music-track/music-track-metadata.entity'
import { MusicTrackWaveform } from '../../../src/modules/music-track/music-track-waveform.entity'
import { MusicHistory } from '../../../src/modules/music-history/music-history.entity'
import { MusicGenre } from '../../../src/modules/music-genres/music-genre.entity'
import { File } from '../../../src/modules/indexing/entities/file.entity'
import { User } from '../../../src/modules/user/user.entity'

const MB = 1024 * 1024

let testApp: TestApp
let authToken: string
let guest: User
let artistId: string
let olderReleaseId: string
let newerReleaseId: string
let tracklessReleaseId: string
const olderTrackIds: string[] = []
let newerTrackId: string

/**
 * Two releases six years apart, one ripped to MP3 and one to FLAC, so that
 * every branch of the summary has something to report: two formats, a year
 * span, two labels, and a lossless share.
 */
beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Artist Summary Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  guest = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guest.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  const artists: Repository<MusicArtist> = testApp.moduleRef.get(getRepositoryToken(MusicArtist))
  const releases: Repository<MusicRelease> = testApp.moduleRef.get(getRepositoryToken(MusicRelease))
  const tracks: Repository<MusicTrack> = testApp.moduleRef.get(getRepositoryToken(MusicTrack))
  const trackMeta: Repository<MusicTrackMetadata> = testApp.moduleRef.get(getRepositoryToken(MusicTrackMetadata))
  const waveforms: Repository<MusicTrackWaveform> = testApp.moduleRef.get(getRepositoryToken(MusicTrackWaveform))
  const files: Repository<File> = testApp.moduleRef.get(getRepositoryToken(File))
  const genres: Repository<MusicGenre> = testApp.moduleRef.get(getRepositoryToken(MusicGenre))

  const artist = await artists.save({ name: 'Summary Artist' } as Partial<MusicArtist>)
  const progRock = await genres.save({ name: 'Prog Rock' } as Partial<MusicGenre>)
  const mathRock = await genres.save({ name: 'Math Rock' } as Partial<MusicGenre>)

  const olderRelease = await releases.save({
    title: 'Older Album',
    artist,
    artists: [artist],
    genres: [progRock, mathRock],
    releaseType: 'album',
  } as Partial<MusicRelease>)

  const newerRelease = await releases.save({
    title: 'Newer Album',
    artist,
    artists: [artist],
    genres: [progRock],
    releaseType: 'album',
  } as Partial<MusicRelease>)

  // A release the indexer knows about but has no tracks for yet
  const tracklessRelease = await releases.save({
    title: 'Trackless Album',
    artist,
    artists: [artist],
    releaseType: 'album',
  } as Partial<MusicRelease>)

  // Only the newer release has cover art
  const thumbnails: Repository<MusicReleaseThumbnail> = testApp.moduleRef.get(getRepositoryToken(MusicReleaseThumbnail))
  await thumbnails.save({
    thumbnailId: 'thumb-newer-album',
    absolutePath: '/thumbs/newer.webp',
    relativeSrc: 'newer.webp',
    size: 'small_nocrop',
    format: 'webp',
    width: 300,
    height: 300,
    bytes: 1000,
    release: newerRelease,
  } as Partial<MusicReleaseThumbnail>)

  // Creates one track, its file on disk, its embedded metadata and its waveform
  const seedTrack = async (options: {
    title: string
    release: MusicRelease
    trackNumber: number
    duration: number
    bytes: number
    extension: string
    lossless: boolean
    year: string
    label: string
    lufs: number
    truePeak: number
  }): Promise<string> => {
    const file = await files.save({
      fileId: `file-${options.title.replace(/\s/g, '-')}`,
      absolutePath: `/music/${options.title}.${options.extension}`,
      relativePath: `${options.title}.${options.extension}`,
      extension: options.extension,
      app: 'music',
      mediaType: 'music',
      size: options.bytes,
      lastSeen: new Date(),
    } as Partial<File>)

    const track = await tracks.save({
      title: options.title,
      trackNumber: options.trackNumber,
      discNumber: 1,
      duration: options.duration,
      bitrate: options.lossless ? 1000000 : 320000,
      release: options.release,
      artists: [artist],
      file,
    } as Partial<MusicTrack>)

    await trackMeta.save([
      { track, metaKey: 'year', metaValue: options.year },
      { track, metaKey: 'label', metaValue: options.label },
      { track, metaKey: 'releasecountry', metaValue: 'US' },
      { track, metaKey: 'media', metaValue: 'CD' },
      { track, metaKey: 'sampleRate', metaValue: '44100' },
      { track, metaKey: 'tool', metaValue: options.lossless ? 'flac 1.4.3' : 'LAME 3.99r' },
      { track, metaKey: 'musicbrainz_artistid', metaValue: 'mbid-summary-artist' },
    ] as Partial<MusicTrackMetadata>[])

    await waveforms.save({
      track,
      version: 1,
      binCount: 2,
      data: { peaks: [1, 1] },
      integratedLufs: options.lufs,
      truePeakDb: options.truePeak,
    } as unknown as Partial<MusicTrackWaveform>)

    return (await tracks.findOne({ where: { id: track.id } })).musicTrackId
  }

  olderTrackIds.push(await seedTrack({
    title: 'Older One',
    release: olderRelease,
    trackNumber: 1,
    duration: 100,
    bytes: 1 * MB,
    extension: 'mp3',
    lossless: false,
    year: '2010',
    label: 'Older Label',
    lufs: -9,
    truePeak: 0.5,
  }))

  olderTrackIds.push(await seedTrack({
    title: 'Older Two',
    release: olderRelease,
    trackNumber: 2,
    duration: 200,
    bytes: 1 * MB,
    extension: 'mp3',
    lossless: false,
    year: '2010',
    label: 'Older Label',
    lufs: -11,
    truePeak: 0.1,
  }))

  newerTrackId = await seedTrack({
    title: 'Newer One',
    release: newerRelease,
    trackNumber: 1,
    duration: 300,
    bytes: 5 * MB,
    extension: 'flac',
    lossless: true,
    year: '2016',
    label: 'Newer Label',
    lufs: -7,
    truePeak: 1.5,
  })

  artistId = (await artists.findOne({ where: { id: artist.id } })).musicArtistId
  olderReleaseId = (await releases.findOne({ where: { id: olderRelease.id } })).musicReleaseId
  newerReleaseId = (await releases.findOne({ where: { id: newerRelease.id } })).musicReleaseId
  tracklessReleaseId = (await releases.findOne({ where: { id: tracklessRelease.id } })).musicReleaseId

  // Two listens on the first track of the older release, nothing on the newer one
  const history: Repository<MusicHistory> = testApp.moduleRef.get(getRepositoryToken(MusicHistory))
  const playedTrack = await tracks.findOne({ where: { musicTrackId: olderTrackIds[0] } })
  await history.save([
    { track: playedTrack, user: guest, progress: 1 },
    { track: playedTrack, user: guest, progress: 0.4 },
  ] as Partial<MusicHistory>[])

  await request(testApp.app.getHttpServer())
    .put('/api/v1/ratings')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ mediaType: RatingMediaType.MUSIC_TRACK, mediaId: olderTrackIds[1], rating: 1 })
    .expect(200)
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

// -------------------------------------------------------------------------
// GET /api/v1/music/artist/:id
// -------------------------------------------------------------------------

describe('GET /api/v1/music/artist/:id', () => {
  it('omits the summary unless it is asked for', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/music/artist/${artistId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.summary).toBeUndefined()
  })

  it('omits play counts and ratings unless they are asked for', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/music/artist/${artistId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.tracks.length).toBe(3)
    for (const track of res.body.tracks) {
      expect(track.playCount).toBeUndefined()
      expect(track.rating).toBeUndefined()
    }
  })

  it('computes play counts and ratings on request, on releases as well as tracks', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/music/artist/${artistId}`)
      .query({ playCount: true, rating: true })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const played = res.body.tracks.find((track) => track.musicTrackId === olderTrackIds[0])
    const rated = res.body.tracks.find((track) => track.musicTrackId === olderTrackIds[1])
    const untouched = res.body.tracks.find((track) => track.musicTrackId === newerTrackId)

    expect(played.playCount).toBe(2)
    expect(played.rating).toBeNull()
    expect(rated.rating).toBe(1)
    expect(rated.playCount).toBe(0)
    expect(untouched.playCount).toBe(0)

    const releaseTrack = res.body.releases
      .find((release) => release.musicReleaseId === olderReleaseId)
      .tracks.find((track) => track.musicTrackId === olderTrackIds[0])

    expect(releaseTrack.playCount).toBe(2)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/music/artist/:id?summary=true
// -------------------------------------------------------------------------

describe('GET /api/v1/music/artist/:id?summary=true', () => {
  const getSummary = async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/music/artist/${artistId}`)
      .query({ summary: true })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
    return res.body.summary
  }

  it('counts the artists releases and tracks', async () => {
    const summary = await getSummary()
    expect(summary.numReleases).toBe(3)
    expect(summary.numTracks).toBe(3)
    expect(summary.runtimeSeconds).toBe(600)
    expect(summary.shortestTrackSeconds).toBe(100)
    expect(summary.longestTrackSeconds).toBe(300)
  })

  it('reports the footprint on disk, broken down by format', async () => {
    const summary = await getSummary()

    expect(summary.bytes).toBe(7 * MB)
    expect(summary.numLossless).toBe(1)

    const mp3 = summary.formats.find((format) => format.extension === 'mp3')
    const flac = summary.formats.find((format) => format.extension === 'flac')

    expect(mp3.numTracks).toBe(2)
    expect(mp3.bytes).toBe(2 * MB)
    expect(flac.numTracks).toBe(1)
    expect(flac.bytes).toBe(5 * MB)
  })

  it('spans the years found across the artists tracks', async () => {
    const summary = await getSummary()
    expect(summary.firstYear).toBe(2010)
    expect(summary.lastYear).toBe(2016)
  })

  it('collects labels, countries, encoders and the MusicBrainz artist ID', async () => {
    const summary = await getSummary()

    expect(summary.labels).toEqual(expect.arrayContaining(['Older Label', 'Newer Label']))
    expect(summary.countries).toEqual(['US'])
    expect(summary.mediaTypes).toEqual(['CD'])
    expect(summary.sampleRates).toEqual([44100])
    expect(summary.encoders).toEqual(expect.arrayContaining(['LAME 3.99r', 'flac 1.4.3']))
    expect(summary.musicbrainzArtistId).toBe('mbid-summary-artist')
  })

  it('ranks genres by how many releases carry them', async () => {
    const summary = await getSummary()
    expect(summary.genres).toEqual([
      { name: 'Prog Rock', numReleases: 2 },
      { name: 'Math Rock', numReleases: 1 },
    ])
  })

  it('averages loudness and reports the hottest true peak', async () => {
    const summary = await getSummary()
    expect(summary.integratedLufs).toBeCloseTo(-9, 5)
    expect(summary.truePeakDb).toBeCloseTo(1.5, 5)
  })

  it('lists every track file for the disk map, newest release first', async () => {
    const summary = await getSummary()

    expect(summary.files.length).toBe(3)
    expect(summary.files.reduce((sum, file) => sum + file.bytes, 0)).toBe(7 * MB)

    const newer = summary.files.find((file) => file.musicTrackId === newerTrackId)
    expect(newer.musicReleaseId).toBe(newerReleaseId)
    expect(newer.bytes).toBe(5 * MB)
    expect(newer.extension).toBe('flac')
    expect(newer.lossless).toBe(true)

    const older = summary.files.find((file) => file.musicTrackId === olderTrackIds[0])
    expect(older.lossless).toBe(false)
    expect(older.title).toBe('Older One')
  })

  it('summarises each release for the timeline, with a year from its own tracks', async () => {
    const summary = await getSummary()

    const older = summary.releases.find((release) => release.musicReleaseId === olderReleaseId)
    const newer = summary.releases.find((release) => release.musicReleaseId === newerReleaseId)

    expect(older.year).toBe(2010)
    expect(older.numTracks).toBe(2)
    expect(older.runtimeSeconds).toBe(300)
    expect(older.bytes).toBe(2 * MB)
    expect(older.extensions).toEqual(['mp3'])
    expect(older.lossless).toBe(false)

    expect(newer.year).toBe(2016)
    expect(newer.numTracks).toBe(1)
    expect(newer.bytes).toBe(5 * MB)
    expect(newer.extensions).toEqual(['flac'])
    expect(newer.lossless).toBe(true)
  })

  it('carries each releases identity so the timeline can render without the release rows', async () => {
    const summary = await getSummary()

    const older = summary.releases.find((release) => release.musicReleaseId === olderReleaseId)
    const newer = summary.releases.find((release) => release.musicReleaseId === newerReleaseId)

    expect(typeof older.id).toBe('number')
    expect(older.title).toBe('Older Album')
    expect(older.releaseType).toBe('album')
    expect(older.hasArtwork).toBe(false)

    expect(newer.title).toBe('Newer Album')
    expect(newer.hasArtwork).toBe(true)
  })

  it('includes releases that have no tracks yet', async () => {
    const summary = await getSummary()

    const trackless = summary.releases.find((release) => release.musicReleaseId === tracklessReleaseId)

    expect(trackless).toBeDefined()
    expect(trackless.title).toBe('Trackless Album')
    expect(trackless.numTracks).toBe(0)
    expect(trackless.bytes).toBe(0)
    expect(trackless.year).toBeNull()
    expect(trackless.extensions).toEqual([])
    expect(trackless.lossless).toBe(false)
  })

  it('reports the current users listening record', async () => {
    const summary = await getSummary()

    expect(summary.listening.plays).toBe(2)
    expect(summary.listening.tracksHeard).toBe(1)
    expect(summary.listening.favorites).toBe(1)
    expect(summary.listening.firstPlayedAt).not.toBeNull()
    expect(summary.listening.lastPlayedAt).not.toBeNull()
  })

  it('breaks the listening record down per release for the coverage bars', async () => {
    const summary = await getSummary()

    const older = summary.listening.releases.find((release) => release.musicReleaseId === olderReleaseId)
    const newer = summary.listening.releases.find((release) => release.musicReleaseId === newerReleaseId)

    expect(older.numTracks).toBe(2)
    expect(older.tracksHeard).toBe(1)
    expect(older.plays).toBe(2)
    expect(older.favorites).toBe(1)
    expect(older.lastPlayedAt).not.toBeNull()

    expect(newer.numTracks).toBe(1)
    expect(newer.tracksHeard).toBe(0)
    expect(newer.plays).toBe(0)
    expect(newer.favorites).toBe(0)
    expect(newer.lastPlayedAt).toBeNull()
  })
})
