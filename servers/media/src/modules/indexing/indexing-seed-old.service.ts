/**
 * This is AI generated and meant only for demonstration purposes in kiosk mode.
 * It has been optimized exclusively for speed, and will break as soon as any
 * changes are made to the db structure.
 */
/* eslint-disable @stylistic/array-element-newline */

import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'

import { Run } from './entities/run.entity'
import { User } from '../user/user.entity'

const FIRST_NAMES = [
  'Michael', 'John', 'David', 'Sarah', 'Emma', 'James', 'Lisa', 'Robert', 'Maria', 'Chris',
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Sam', 'Jamie', 'Kevin', 'Laura',
  'Marcus', 'Nina', 'Oscar', 'Paula', 'Quinn', 'Rachel', 'Steven', 'Tina', 'Victor', 'Wendy',
  'Andre', 'Bianca', 'Carlos', 'Diana', 'Ethan', 'Fiona', 'George', 'Hannah', 'Ivan', 'Julia',
  'Karl', 'Lena', 'Mason', 'Nadia', 'Oliver', 'Priya', 'Ray', 'Sofia', 'Trevor', 'Uma',
  'Vincent', 'Xena', 'Yasmine', 'Zach', 'Amber', 'Blake', 'Caleb', 'Daisy', 'Eli', 'Faith',
  'Grant', 'Holly', 'Ian', 'Jade', 'Kane', 'Lydia', 'Miles', 'Nova', 'Owen', 'Piper',
  'Reed', 'Stella', 'Theo', 'Ursula', 'Vera', 'Wade', 'Xander', 'Yara', 'Zoe', 'Aaron',
  'Bette', 'Clay', 'Della', 'Eddie', 'Frida', 'Glen', 'Iris', 'Jesse', 'Kim',
  'Lance', 'Mae', 'Neil', 'Opal', 'Percy', 'Rosa', 'Scott', 'Tara', 'Ulric', 'Violet',
]

const LAST_NAMES = [
  'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas',
  'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Lewis',
  'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen',
  'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Gonzalez', 'Carter', 'Mitchell', 'Perez',
  'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez',
  'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper',
  'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson',
  'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman',
  'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson', 'Hughes', 'Flores', 'Washington', 'Butler', 'Simmons',
  'Foster', 'Gonzales', 'Bryant', 'Alexander', 'Russell', 'Griffin', 'Diaz', 'Hayes', 'Myers', 'Ford',
]

const BAND_NOUNS = [
  'Beatles', 'Stones', 'Doors', 'Eagles', 'Clash', 'Pretenders', 'Replacements', 'Pixies', 'Strokes', 'Killers',
  'Vines', 'Hives', 'Kinks', 'Byrds', 'Zombies', 'Animals', 'Yardbirds', 'Hollies', 'Faces', 'Jam',
  'Cure', 'Smiths', 'Specials', 'Skids', 'Undertones', 'Rezillos', 'Adverts', 'Damned', 'Drones', 'Saints',
  'Meteors', 'Cramps', 'Misfits', 'Dickies', 'Germs', 'Weirdos', 'Avengers', 'Bags', 'Controllers', 'Zeros',
  'Blasters', 'Knitters', 'Stray Cats', 'Reverend Horton Heat', 'Headcoats', 'Nomads', 'Sonics', 'Wailers', 'Trashmen', 'Surfaris',
  'Ventures', 'Shadows', 'Tornadoes', 'Astronauts', 'Frogmen', 'Pyramids', 'Challengers', 'Impacts', 'Fireballs', 'Chantays',
]

const BAND_ADJS = [
  'Rolling', 'Flying', 'Broken', 'Electric', 'Cosmic', 'Sonic', 'Neon', 'Crystal',
  'Silver', 'Black', 'White', 'Red', 'Blue', 'Golden', 'Iron', 'Steel',
  'Burning', 'Frozen', 'Silent', 'Loud', 'Wild', 'Velvet', 'Hollow', 'Faded',
  'Plastic', 'Rubber', 'Wooden', 'Glass', 'Paper', 'Marble', 'Concrete', 'Liquid',
  'Ancient', 'Modern', 'Future', 'Distant', 'Local', 'Global', 'Astral', 'Lunar',
  'Solar', 'Stellar', 'Atomic', 'Digital', 'Analog', 'Static', 'Dynamic', 'Kinetic',
  'Savage', 'Gentle', 'Heavy', 'Light', 'Sharp', 'Soft', 'Hard', 'Smooth',
  'Rusty', 'Shiny', 'Dusty', 'Misty', 'Stormy', 'Sunny', 'Cloudy', 'Windy',
]

const GENRE_NAMES = [
  'Rock', 'Jazz', 'Electronic', 'Classical', 'Hip-Hop', 'Pop', 'Metal', 'Folk', 'R&B', 'Country',
  'Blues', 'Indie', 'Alternative', 'Punk', 'Soul', 'Reggae', 'Funk', 'World', 'Ambient', 'Experimental',
  'Psychedelic', 'Shoegaze', 'Post-Rock', 'Math Rock', 'Prog Rock', 'Krautrock', 'No Wave', 'Dream Pop',
  'Synthwave', 'Darkwave', 'Industrial', 'Noise', 'Drone', 'Doom Metal', 'Black Metal', 'Death Metal',
  'Thrash Metal', 'Grunge', 'Post-Punk', 'New Wave', 'Garage Rock', 'Surf Rock', 'Rockabilly', 'Swing',
  'Bebop', 'Free Jazz', 'Cool Jazz', 'Fusion', 'Latin Jazz', 'Bossa Nova', 'Samba', 'Cumbia',
  'Salsa', 'Merengue', 'Afrobeat', 'Highlife', 'Soukous', 'Mbaqanga', 'Juju', 'Fuji',
  'Bluegrass', 'Americana', 'Gospel', 'Spiritual', 'Motown', 'Northern Soul', 'Disco', 'House',
  'Techno', 'Trance', 'Drum and Bass', 'Jungle', 'Dubstep', 'Grime', 'Trip-Hop', 'Chillout',
  'New Age', 'Minimalism', 'Contemporary Classical', 'Chamber Music', 'Opera', 'Baroque', 'Romantic',
]

const ALBUM_ADJS = [
  'Lost', 'Golden', 'Midnight', 'Broken', 'Electric', 'Silent', 'Burning', 'Faded', 'Ancient', 'Endless',
  'Hollow', 'Velvet', 'Copper', 'Silver', 'Crimson', 'Pale', 'Deep', 'Wild', 'Frozen', 'Distant',
  'Scattered', 'Buried', 'Lifted', 'Tangled', 'Twisted', 'Shattered', 'Fractured', 'Weathered', 'Rusted', 'Polished',
  'Haunted', 'Restless', 'Wandering', 'Fading', 'Rising', 'Falling', 'Drifting', 'Floating', 'Sinking', 'Soaring',
  'Brutal', 'Tender', 'Bitter', 'Sweet', 'Sour', 'Sharp', 'Smooth', 'Rough', 'Warm', 'Cold',
]

const ALBUM_NOUNS = [
  'Dreams', 'Roads', 'Echoes', 'Shadows', 'Waves', 'Fires', 'Stars', 'Skies', 'Rivers', 'Ruins',
  'Gardens', 'Machines', 'Ghosts', 'Mirrors', 'Towers', 'Bridges', 'Tunnels', 'Cliffs', 'Valleys', 'Peaks',
  'Signals', 'Circuits', 'Frequencies', 'Transmissions', 'Broadcasts', 'Pulses', 'Currents', 'Charges', 'Sparks', 'Flashes',
  'Portraits', 'Landscapes', 'Horizons', 'Boundaries', 'Thresholds', 'Gateways', 'Passages', 'Corridors', 'Chambers', 'Vaults',
  'Memories', 'Visions', 'Illusions', 'Reflections', 'Refractions', 'Distortions', 'Patterns', 'Textures', 'Structures', 'Fragments',
]

const ALBUM_PLACES = [
  'New York', 'London', 'Tokyo', 'Memphis', 'Chicago', 'Berlin', 'Nashville', 'Detroit', 'Seattle', 'Atlanta',
  'Los Angeles', 'New Orleans', 'Paris', 'Amsterdam', 'Dublin', 'Manchester', 'Liverpool', 'Glasgow', 'Bristol', 'Leeds',
  'Melbourne', 'Sydney', 'Auckland', 'Toronto', 'Montreal', 'Vancouver', 'São Paulo', 'Buenos Aires', 'Mexico City', 'Havana',
  'Lagos', 'Nairobi', 'Johannesburg', 'Cairo', 'Casablanca', 'Istanbul', 'Moscow', 'Prague', 'Vienna', 'Budapest',
  'Barcelona', 'Madrid', 'Lisbon', 'Rome', 'Milan', 'Athens', 'Warsaw', 'Stockholm', 'Oslo', 'Copenhagen',
]

const ALBUM_TIMES = [
  'Sessions', 'Nights', 'Days', 'Years', 'Hours', 'Moments',
  'Mornings', 'Afternoons', 'Evenings', 'Dusks', 'Dawns', 'Midnights',
  'Decades', 'Centuries', 'Eras', 'Ages', 'Epochs', 'Seasons',
  'Chapters', 'Volumes', 'Episodes', 'Movements', 'Passages', 'Phases',
]

const TRACK_VERBS = [
  'Walk', 'Run', 'Fall', 'Rise', 'Burn', 'Dream', 'Dance', 'Sing', 'Fly', 'Fade',
  'Break', 'Bend', 'Twist', 'Turn', 'Spin', 'Drift', 'Float', 'Sink', 'Climb', 'Crawl',
  'Hide', 'Seek', 'Find', 'Lose', 'Forget', 'Remember', 'Follow', 'Leave', 'Stay', 'Return',
  'Bleed', 'Heal', 'Breathe', 'Sleep', 'Wake', 'Fight', 'Surrender', 'Escape', 'Chase', 'Wait',
  'Call', 'Cry', 'Laugh', 'Scream', 'Whisper', 'Shout', 'Listen', 'Watch', 'Feel', 'Touch',
]

const TRACK_ADJS = [
  'Broken', 'Golden', 'Lost', 'Silent', 'Wild', 'Dark', 'Bright', 'Cold', 'Deep', 'Free',
  'Hollow', 'Heavy', 'Light', 'Sharp', 'Soft', 'Hard', 'Warm', 'Distant', 'Close', 'Strange',
  'Beautiful', 'Ugly', 'Pale', 'Vivid', 'Dull', 'Blind', 'Deaf', 'Numb', 'Alive', 'Dead',
  'Ancient', 'New', 'Old', 'Young', 'Tired', 'Restless', 'Fearless', 'Hopeless', 'Endless', 'Boundless',
  'Electric', 'Acoustic', 'Magnetic', 'Hypnotic', 'Frantic', 'Serene', 'Violent', 'Gentle', 'Savage', 'Tender',
]

const TRACK_NOUNS = [
  'Heart', 'Road', 'Night', 'Fire', 'Rain', 'Sky', 'Sea', 'Dream', 'Soul', 'Light',
  'Stone', 'Wind', 'Blood', 'Bone', 'Skin', 'Eye', 'Hand', 'Voice', 'Mind', 'Ghost',
  'Mirror', 'Shadow', 'Echo', 'Signal', 'Machine', 'Garden', 'Tower', 'Bridge', 'River', 'Mountain',
  'City', 'Desert', 'Forest', 'Ocean', 'Island', 'Cave', 'Valley', 'Cliff', 'Shore', 'Horizon',
  'Star', 'Moon', 'Sun', 'Cloud', 'Thunder', 'Lightning', 'Smoke', 'Flame', 'Ice', 'Dust',
  'Clock', 'Map', 'Key', 'Door', 'Window', 'Wall', 'Floor', 'Ceiling', 'Roof', 'Ground',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const result: T[] = []
  const used = new Set<number>()
  const cap = Math.min(n, arr.length)
  while (result.length < cap) {
    const i = Math.floor(Math.random() * arr.length)
    if (!used.has(i)) {
      used.add(i)
      result.push(arr[i])
    }
  }
  return result
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickDiscCount(): number {
  const r = Math.random()
  if (r < 0.70) return 1
  if (r < 0.90) return 2
  return 3
}

// Average ~8, range 1–25. Uses a weighted distribution skewed toward 8–12.
function pickTrackCount(): number {
  const r = Math.random()
  if (r < 0.05) return rand(1, 3)
  if (r < 0.20) return rand(4, 6)
  if (r < 0.65) return rand(7, 12)
  if (r < 0.90) return rand(13, 18)
  return rand(19, 25)
}

function generateArtistName(index: number): string {
  const pattern = index % 5
  if (pattern === 0) return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
  if (pattern === 1) return `The ${pick(BAND_NOUNS)}`
  if (pattern === 2) return `${pick(BAND_ADJS)} ${pick(BAND_NOUNS)}`
  if (pattern === 3) return `${pick(FIRST_NAMES)} & The ${pick(BAND_NOUNS)}`
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${pick(['Band', 'Quartet', 'Orchestra'])}`
}

function generateAlbumName(): string {
  const pattern = rand(0, 4)
  if (pattern === 0) return `${pick(ALBUM_ADJS)} ${pick(ALBUM_NOUNS)}`
  if (pattern === 1) return `${pick(ALBUM_PLACES)} ${pick(ALBUM_TIMES)}`
  if (pattern === 2) return `The ${pick(ALBUM_NOUNS)} Sessions`
  if (pattern === 3) return `Live at ${pick(ALBUM_PLACES)}`
  return `${pick(ALBUM_ADJS)} ${pick(ALBUM_TIMES)}`
}

function generateTrackTitle(): string {
  const pattern = rand(0, 4)
  if (pattern === 0) return `${pick(TRACK_VERBS)}ing in the ${pick(TRACK_NOUNS)}`
  if (pattern === 1) return `The ${pick(TRACK_ADJS)} ${pick(TRACK_NOUNS)}`
  if (pattern === 2) return `${pick(TRACK_NOUNS)} of ${pick(TRACK_NOUNS)}`
  if (pattern === 3) return `Don't ${pick(TRACK_VERBS)} Me ${pick(TRACK_ADJS)}`
  return `When ${pick(TRACK_NOUNS)}s ${pick(TRACK_VERBS)}`
}

function pickExtension(): { ext: string; mimeType: string } {
  const r = Math.random()
  if (r < 0.6) return { ext: 'mp3', mimeType: 'audio/mpeg' }
  if (r < 0.9) return { ext: 'flac', mimeType: 'audio/flac' }
  return { ext: 'm4a', mimeType: 'audio/mp4' }
}

// How many contributing artists beyond the primary (0–2 extra, so total 1–3)
function pickContributingArtistCount(): number {
  const r = Math.random()
  if (r < 0.60) return 0
  if (r < 0.85) return 1
  return 2
}


@Injectable()
export class IndexingSeedService {
  constructor(
    @InjectRepository(Run) private runRepository: Repository<Run>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  seed(releaseCount: number): void {
    this.runSeed(releaseCount).catch((err) => console.error(err))
  }

  private async runSeed(releaseCount: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: {} })
    if (!user) {
      throw new Error('No user found in database. Cannot seed without a user.')
    }

    Logger.debug(`Starting seed: ${releaseCount} releases`, 'IndexingSeedService')

    const run = this.runRepository.create({ runId: uuidv4(), status: 'seeding' })
    await this.runRepository.save(run)

    const now = new Date().toISOString()
    const userId = user.id
    const runId = run.id

    // Helper: bulk insert via raw SQL, returns array of inserted row IDs.
    // Automatically chunks to stay under SQLite's 32766 parameter limit.
    const bulkInsert = async (table: string, cols: string[], rows: unknown[][]): Promise<number[]> => {
      if (rows.length === 0) return []
      const chunkSize = Math.floor(32766 / cols.length)
      const ids: number[] = []
      const placeholderRow = `(${cols.map(() => '?').join(',')})`
      const colList = cols.map((c) => `"${c}"`).join(',')
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize)
        const sql = `INSERT INTO "${table}" (${colList}) VALUES ${chunk.map(() => placeholderRow).join(',')}`
        const lastId: number = await this.dataSource.query(sql, chunk.flat())
        for (let j = 0; j < chunk.length; j++) ids.push(lastId - chunk.length + 1 + j)
      }
      return ids
    }

    // ── Artist pool ────────────────────────────────────────────────────────
    const artistPoolSize = Math.min(500, Math.max(5, Math.ceil(releaseCount / 3)))
    const artistNames = new Set<string>()
    while (artistNames.size < artistPoolSize) {
      artistNames.add(generateArtistName(artistNames.size))
    }

    const artistRows = Array.from(artistNames).map((name) => [uuidv4(), name, name])
    const artistIds = await bulkInsert('music_artist', ['music_artist_id', 'name', 'sort_name'], artistRows)

    // ── Genre pool ─────────────────────────────────────────────────────────
    const genreRows = GENRE_NAMES.map((name) => [uuidv4(), name])
    const genreIds = await bulkInsert('music_genre', ['music_genre_id', 'name'], genreRows)

    Logger.debug(`Created ${artistIds.length} artists and ${genreIds.length} genres`, 'IndexingSeedService')

    // Pre-build once: artistId → all other artistIds
    const otherArtistMap = new Map<number, number[]>()
    for (const aid of artistIds) otherArtistMap.set(aid, artistIds.filter((id) => id !== aid))

    const BATCH_SIZE = 500
    const logInterval = Math.max(1, Math.floor(releaseCount / 20))

    for (let r = 0; r < releaseCount; r += BATCH_SIZE) {
      await new Promise((resolve) => setImmediate(resolve))
      const batchEnd = Math.min(r + BATCH_SIZE, releaseCount)
      if (r % logInterval === 0 || r === 0) {
        Logger.debug(`Seeding releases ${r + 1}–${batchEnd} of ${releaseCount}`, 'IndexingSeedService')
      }

      // Step 1: releases
      const batchMeta: { primaryArtistId: number; genreIds: number[]; albumName: string; discCount: number }[] = []
      const releaseRows: unknown[][] = []
      for (let ri = r; ri < batchEnd; ri++) {
        const primaryArtistId = pick(artistIds)
        const albumName = generateAlbumName()
        batchMeta.push({ primaryArtistId, genreIds: pickN(genreIds, rand(1, 3)), albumName, discCount: pickDiscCount() })
        releaseRows.push([uuidv4(), albumName, albumName, primaryArtistId])
      }
      const insertedReleaseIds = await bulkInsert('music_release', ['music_release_id', 'title', 'sort_title', 'artist_id'], releaseRows)

      // Step 2: files (one per track) + track metadata
      const fileRows: unknown[][] = []
      const trackMeta: { releaseId: number; disc: number; track: number; title: string; artistIds: number[] }[] = []

      for (let i = 0; i < batchMeta.length; i++) {
        const { primaryArtistId, albumName, discCount } = batchMeta[i]
        const releaseId = insertedReleaseIds[i]
        const otherArtistIds = otherArtistMap.get(primaryArtistId)!

        for (let disc = 1; disc <= discCount; disc++) {
          const trackCount = pickTrackCount()
          for (let t = 1; t <= trackCount; t++) {
            const trackTitle = generateTrackTitle()
            const { ext, mimeType } = pickExtension()
            const discSegment = discCount > 1 ? `CD${disc}/` : ''
            const fileName = `${String(t).padStart(2, '0')} - ${trackTitle}.${ext}`
            const relativePath = `/Artist${primaryArtistId}/${albumName}/${discSegment}${fileName}`
            fileRows.push([uuidv4(), `/media/music${relativePath}`, relativePath, mimeType, ext, 'music', 'music', rand(2_000_000, 50_000_000), now, userId, runId])
            trackMeta.push({ releaseId, disc, track: t, title: trackTitle, artistIds: [primaryArtistId, ...pickN(otherArtistIds, pickContributingArtistCount())] })
          }
        }
      }
      const insertedFileIds = await bulkInsert('file', ['file_id', 'absolute_path', 'relative_path', 'mime_type', 'extension', 'app', 'media_type', 'size', 'last_seen', 'user_id', 'run_id'], fileRows)

      // Step 3: tracks
      const trackRows: unknown[][] = trackMeta.map((m, i) => [uuidv4(), m.title, m.title, m.track, m.disc, rand(120, 480) + Math.random(), pick([128, 192, 256, 320, 1411]) + Math.random(), insertedFileIds[i], m.releaseId])
      const insertedTrackIds = await bulkInsert('music_track', ['music_track_id', 'title', 'sort_title', 'track_number', 'disc_number', 'duration', 'bitrate', 'file_id', 'release_id'], trackRows)

      // Step 4: join tables
      const releaseGenreLinks: unknown[][] = []
      const releaseArtistLinks: unknown[][] = []
      const trackArtistLinks: unknown[][] = []

      for (let i = 0; i < batchMeta.length; i++) {
        const releaseId = insertedReleaseIds[i]
        for (const gid of batchMeta[i].genreIds) releaseGenreLinks.push([releaseId, gid])
        releaseArtistLinks.push([batchMeta[i].primaryArtistId, releaseId])
      }
      for (let i = 0; i < trackMeta.length; i++) {
        for (const aid of trackMeta[i].artistIds) trackArtistLinks.push([insertedTrackIds[i], aid])
      }

      await Promise.all([
        bulkInsert('music_release_genres_music_genre', ['music_release_id', 'music_genre_id'], releaseGenreLinks),
        bulkInsert('music_artist_releases_music_release', ['music_artist_id', 'music_release_id'], releaseArtistLinks),
        bulkInsert('music_track_artists_music_artist', ['music_track_id', 'music_artist_id'], trackArtistLinks),
      ])
    }

    run.status = 'completed'
    await this.runRepository.save(run)
    Logger.debug(`Seed complete`, 'IndexingSeedService')
  }
}
