import { randomInt } from './seed-common'

/*
 * Pure, framework-free generators that build a believable, genre-appropriate
 * catalogue of artists / albums / tracks for the public demo. The demo seed
 * service walks the returned structure and writes it to the /music mount.
 *
 * Pools are intentionally large (~100 where it matters) so that views which mix
 * tracks across artists/albums don't show obvious duplicate titles.
 */

export interface DemoAlbum { title: string, tracks: string[] }
export interface DemoArtist { name: string, albums: DemoAlbum[] }
export interface DemoLibrary { genre: string, dirName: string, artists: DemoArtist[] }

// Per-genre shape. Counts are ranges so the catalogue looks organic; `scale`
// multiplies the artist counts to grow/shrink the total track count.
interface GenreSpec {
  genre: string
  dirName: string
  artists: number
  albumsPerArtist: [number, number]
  tracksPerAlbum: [number, number]
}

const SPECS: GenreSpec[] = [
  { genre: 'Classical',    dirName: 'Classical',    artists: 10, albumsPerArtist: [1, 2], tracksPerAlbum: [4, 5] },
  { genre: 'Contemporary', dirName: 'Contemporary', artists: 15, albumsPerArtist: [1, 3], tracksPerAlbum: [9, 12] },
  { genre: 'Soundtracks',  dirName: 'Soundtracks',  artists: 7,  albumsPerArtist: [1, 2], tracksPerAlbum: [12, 16] },
]

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(0, i)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Draws `count` unique values from `factory`, appending a numeric suffix only if
// the factory can't produce enough distinct values.
function uniqueList(count: number, factory: () => string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  let guard = 0
  while (out.length < count) {
    let name = factory()
    if (seen.has(name)) {
      guard++
      if (guard > count * 8) name = `${name} (${out.length + 1})`
      else continue
    }
    seen.add(name)
    out.push(name)
  }
  return out
}

/* ---------------------------------- Classical --------------------------------- */

const CLASSICAL_ENSEMBLES = [
  'Berlin Chamber Orchestra',
  'Vienna Sinfonietta',
  'The Amadeus Quartet',
  'Prague Philharmonia',
  'Nordic Strings Ensemble',
  'Concerto Köln',
  'The Hanover Consort',
  'Aurora Baroque Players',
  'The Ridgemont Quartet',
  'Camerata Ostiense',
  'The Salzburg Soloists',
  'Meridian Chamber Players',
  'The Wren Ensemble',
  'Orchestra of the Old Mill',
  'The Larkspur Trio',
  'Cantus Firmus Collective',
  'The Blackwood Quartet',
  'Helsinki Sinfonietta',
  'The Ashgrove Players',
  'Camerata Boreale',
  'The Verdant Consort',
  'Munich Chamber Academy',
  'The Fenwick Quartet',
  'Orchestra della Riva',
  'The Silvermere Ensemble',
  'The Kestrel Trio',
  'Lyon Baroque Collective',
  'The Northgate Players',
  'The Marlowe Quartet',
  'Sinfonia dell’Alba',
]
const CLASSICAL_FORMS = [
  'Symphony',
  'Piano Sonata',
  'String Quartet',
  'Violin Concerto',
  'Cello Suite',
  'Serenade',
  'Rhapsody',
  'Concerto Grosso',
  'Piano Concerto',
  'Divertimento',
  'Chamber Symphony',
  'Sonatina',
]
const CLASSICAL_KEYS = [
  'C major',
  'G minor',
  'D major',
  'E-flat major',
  'B minor',
  'A major',
  'F-sharp minor',
  'B-flat major',
  'E minor',
  'A-flat major',
  'F major',
  'C-sharp minor',
  'G major',
  'D minor',
]
const CLASSICAL_OPUS_FORMS = [
  'Nocturnes',
  'Preludes',
  'Études',
  'Impromptus',
  'Bagatelles',
  'Intermezzi',
  'Mazurkas',
  'Ballades',
  'Romances',
  'Waltzes',
]
const CLASSICAL_TEMPI = [
  'Allegro con brio',
  'Andante cantabile',
  'Adagio sostenuto',
  'Allegretto',
  'Presto',
  'Largo',
  'Vivace',
  'Menuetto — Trio',
  'Scherzo — Allegro',
  'Rondo — Allegro',
  'Moderato',
  'Andante con moto',
  'Allegro ma non troppo',
  'Adagio molto',
  'Allegro assai',
  'Andantino',
  'Larghetto',
  'Allegro vivace',
  'Grave — Allegro',
  'Tempo di Menuetto',
  'Molto adagio',
  'Presto agitato',
  'Andante grazioso',
  'Allegro moderato',
]
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

function classicalAlbumTitle(): string {
  if (randomInt(0, 3) === 0) {
    return `${pick(CLASSICAL_OPUS_FORMS)}, Op. ${randomInt(1, 120)}`
  }
  return `${pick(CLASSICAL_FORMS)} No. ${randomInt(1, 9)} in ${pick(CLASSICAL_KEYS)}`
}

/* -------------------------------- Contemporary -------------------------------- */

const BAND_FIRST = [
  'Neon',
  'Velvet',
  'Paper',
  'Midnight',
  'Silver',
  'Wild',
  'Golden',
  'Coastal',
  'Static',
  'Lunar',
  'Crimson',
  'Hollow',
  'Echo',
  'Northern',
  'Glass',
  'Amber',
  'Violet',
  'Sable',
  'Cobalt',
  'Marble',
  'Electric',
  'Wandering',
  'Quiet',
  'Distant',
  'Slow',
  'Wine-Dark',
  'Pale',
  'Ivory',
  'Restless',
  'Younger',
  'Winter',
  'Feral',
  'Gilded',
  'Saltwater',
  'Rosewood',
]
const BAND_SECOND = [
  'Harbor',
  'Kites',
  'Arrows',
  'Foxes',
  'Rivers',
  'Ghosts',
  'Signals',
  'Avenue',
  'Season',
  'Gardens',
  'Lanterns',
  'Waves',
  'Machines',
  'Theory',
  'Parade',
  'Coast',
  'Skyline',
  'Divers',
  'Fields',
  'Halls',
  'Circuit',
  'Union',
  'Choir',
  'Tides',
  'Cinema',
  'Motel',
  'Orchard',
  'Cathedral',
  'Wolves',
  'Embers',
  'Continental',
  'Meridian',
  'Aviary',
  'Static',
  'Company',
]
const ALBUM_WORDS_A = [
  'Midnight',
  'Golden',
  'Static',
  'Paper',
  'Slow',
  'Wild',
  'Neon',
  'Home',
  'Silver',
  'Distant',
  'Electric',
  'Quiet',
  'Northern',
  'Endless',
  'Velvet',
  'Winter',
  'Coastal',
  'Younger',
  'Hollow',
  'Amber',
  'Restless',
  'Pale',
  'Bright',
  'Faded',
  'Lonesome',
  'Weightless',
  'Crimson',
  'Feral',
  'Gilded',
  'Saltwater',
]
const ALBUM_WORDS_B = [
  'Signals',
  'Hour',
  'Bloom',
  'Weather',
  'Light',
  'Youth',
  'Coastlines',
  'Sleep',
  'Season',
  'Machines',
  'Rooms',
  'Gardens',
  'Skyline',
  'Currents',
  'Ghosts',
  'Tides',
  'Anthems',
  'Country',
  'Motion',
  'Static',
  'Cinema',
  'Fever',
  'Distance',
  'Interiors',
  'Daydream',
  'Frequencies',
  'Horizons',
  'Nights',
  'Lights',
  'Echoes',
]
const SONG_WORDS_A = [
  'Ghost',
  'Paper',
  'Ocean',
  'Golden',
  'Silent',
  'Broken',
  'Open',
  'Falling',
  'Younger',
  'Hollow',
  'Bright',
  'Faded',
  'Restless',
  'Northern',
  'Weightless',
  'Amber',
  'Distant',
  'Quiet',
  'Velvet',
  'Electric',
  'Slow',
  'Wild',
  'Crimson',
  'Lonesome',
  'Endless',
  'Winter',
  'Pale',
  'Coastal',
  'Feral',
  'Gilded',
  'Saltwater',
  'Neon',
  'Static',
  'Midnight',
  'Wandering',
  'Fearless',
  'Tender',
  'Restive',
  'Hazy',
  'Lucky',
  'Half',
  'Every',
  'Nobody’s',
  'Somewhere',
  'Nothing',
]
const SONG_WORDS_B = [
  'Lights',
  'Trails',
  'Eyes',
  'Hearts',
  'Waves',
  'Roads',
  'Hands',
  'Signals',
  'Summers',
  'Machines',
  'Windows',
  'Fires',
  'Shadows',
  'Rivers',
  'Anthem',
  'Dreaming',
  'Static',
  'Motion',
  'Weather',
  'Youth',
  'Season',
  'Cinema',
  'Skyline',
  'Tides',
  'Ghosts',
  'Bloom',
  'Country',
  'Distance',
  'Fever',
  'Horizon',
  'Daydream',
  'Currents',
  'Company',
  'Parade',
  'Choir',
  'Wolves',
  'Embers',
  'Lanterns',
  'Gardens',
  'Nights',
  'Frequency',
  'Interior',
  'Avenue',
  'Harbor',
  'Continental',
]

/* -------------------------------- Soundtracks --------------------------------- */

const COMPOSER_FIRST = [
  'Aria',
  'Viktor',
  'Elena',
  'Kaito',
  'Nadia',
  'Soren',
  'Lucia',
  'Emil',
  'Mira',
  'Theodore',
  'Ingrid',
  'Rafael',
  'Yuki',
  'Cassian',
  'Livia',
  'Anton',
  'Freya',
  'Mateo',
  'Selin',
  'Oskar',
  'Noor',
  'Dmitri',
  'Camille',
  'Hana',
  'Ravi',
  'Astrid',
  'Julien',
  'Petra',
  'Idris',
  'Wren',
]
const COMPOSER_LAST = [
  'Nakamura',
  'Salt',
  'Cross',
  'Vandenberg',
  'Okonkwo',
  'Larsson',
  'Moreau',
  'Bianchi',
  'Halloran',
  'Petrov',
  'Nyström',
  'Delacroix',
  'Ashworth',
  'Ferreira',
  'Voss',
  'Adeyemi',
  'Kaur',
  'Sandoval',
  'Beaumont',
  'Novak',
  'Rasmussen',
  'Kovač',
  'Marchetti',
  'Blackwood',
  'Ibarra',
  'Sørensen',
  'Almeida',
  'Whitlock',
  'Reyes',
  'Hartmann',
]
const FILM_TITLES = [
  'The Last Horizon',
  'Crimson Tide',
  'Silent Harbor',
  'Northern Light',
  'The Glass City',
  'Ashfall',
  'The Long Winter',
  'Tidewater',
  'Vanishing Point',
  'The Cartographer',
  'Salt and Stone',
  'Ember',
  'The Reservoir',
  'Paper Moon Rising',
  'A Colder War',
  'The Hollow Coast',
  'Foxfire',
  'The Quiet Fleet',
  'Nightjar',
  'The Amber Road',
  'Undertow',
  'The Far Meridian',
  'Blackwater',
  'The Ninth Winter',
  'Solstice',
  'The Weight of Water',
  'Driftwood',
  'The Lantern Keeper',
  'Iron Valley',
  'Sundowners',
  'The Gilded Cage',
  'Halcyon',
  'The Wolf and the Moon',
  'Static Fields',
  'The Last Ferry',
  'Wildfell',
  'The Tin Sky',
  'Marrow',
  'The Long Way Down',
  'Cinder and Salt',
  'The Silent Orchard',
  'Nightfall Over Dover',
  'The Drowned Coast',
  'Kingfisher',
  'The Pale Horizon',
]
const CUES = [
  'Main Theme',
  'Opening Titles',
  'First Light',
  'The Chase',
  'Pursuit',
  'Reunion',
  'The Letter',
  'Aftermath',
  'Homecoming',
  'Nightfall',
  'The Reveal',
  'Escape',
  'Into the Deep',
  'The Long Road',
  'Fireside',
  'The Reckoning',
  'Falling Snow',
  'Finale',
  'End Credits',
  'A Quiet Place',
  'The Departure',
  'Crossing the River',
  'A Distant Signal',
  'The Old House',
  'Rooftops',
  'The Confession',
  'Under the Ice',
  'Last Train Home',
  'The Gathering Storm',
  'Farewell',
  'The Search',
  'Broken Glass',
  'A New Morning',
  'The Descent',
  'Wings',
  'The Vigil',
  'Chasing Shadows',
  'The Bargain',
  'Homefire',
  'Into the Woods',
  'The Getaway',
  'Waltz for Nadia',
  'The Empty Station',
  'Circling Back',
  'The Promise',
  'Snowbound',
  'The Awakening',
  'Nocturne',
  'A Slow Unraveling',
  'The Watchtower',
  'Across the Border',
  'The Last Message',
  'Embers',
  'The Long Goodbye',
  'Rising Tide',
  'The Hunt',
  'Threshold',
  'The Cliffside',
  'Aurora',
  'The Turning',
  'Quiet Streets',
  'The Signal Fades',
  'Homeward',
  'The Storm Breaks',
  'Undertow',
  'The Final Mile',
  'A Better World',
  'The Old Photograph',
  'Ashes',
  'The Long Dark',
  'Sunrise Over the Valley',
  'The Message',
  'Broken Compass',
  'The Vanishing',
  'Held Breath',
  'The Return',
  'Cold Water',
  'The Last Stand',
  'Drift',
  'The Clearing',
  'Nightwatch',
  'The Wound',
  'Gathering Light',
  'The Crossing',
  'A Small Miracle',
  'The Cost',
  'The First Snow',
  'Vespers',
  'The Long Fall',
  'Salt Air',
  'The Reckoner',
  'Homestretch',
  'The Quiet After',
  'Lanterns',
  'The Weight of It',
  'Daybreak',
  'The Far Shore',
  'Coda',
]

/* --------------------------------- Assembly ----------------------------------- */

function buildArtist(spec: GenreSpec, artistName: string): DemoArtist {
  const albumCount = randomInt(spec.albumsPerArtist[0], spec.albumsPerArtist[1])
  const albums: DemoAlbum[] = []

  for (let a = 0; a < albumCount; a++) {
    const trackCount = randomInt(spec.tracksPerAlbum[0], spec.tracksPerAlbum[1])
    let title: string
    let tracks: string[]

    if (spec.genre === 'Classical') {
      title = classicalAlbumTitle()
      tracks = Array.from({ length: Math.min(trackCount, ROMAN.length) }, (_, i) => `${ROMAN[i]}. ${pick(CLASSICAL_TEMPI)}`)
    } else if (spec.genre === 'Soundtracks') {
      title = `${pick(FILM_TITLES)} (Original Motion Picture Soundtrack)`
      tracks = uniqueList(Math.min(trackCount, CUES.length), () => pick(CUES))
    } else {
      title = `${pick(ALBUM_WORDS_A)} ${pick(ALBUM_WORDS_B)}`
      tracks = uniqueList(trackCount, () => `${pick(SONG_WORDS_A)} ${pick(SONG_WORDS_B)}`)
    }

    albums.push({ title, tracks })
  }

  return { name: artistName, albums }
}

function buildLibrary(spec: GenreSpec, scale: number): DemoLibrary {
  const artistTarget = Math.max(1, Math.round(spec.artists * scale))

  let names: string[]
  if (spec.genre === 'Classical') {
    names = shuffle(CLASSICAL_ENSEMBLES).slice(0, artistTarget)
    if (names.length < artistTarget) names = uniqueList(artistTarget, () => pick(CLASSICAL_ENSEMBLES))
  } else if (spec.genre === 'Soundtracks') {
    names = uniqueList(artistTarget, () => `${pick(COMPOSER_FIRST)} ${pick(COMPOSER_LAST)}`)
  } else {
    names = uniqueList(artistTarget, () => `${pick(BAND_FIRST)} ${pick(BAND_SECOND)}`)
  }

  return {
    genre: spec.genre,
    dirName: spec.dirName,
    artists: names.map((name) => buildArtist(spec, name)),
  }
}

// Builds the three genre libraries for the demo. `scale` (default 1) grows or
// shrinks the artist counts proportionally; the defaults land near ~500 tracks.
export function buildDemoLibraries(scale = 1): DemoLibrary[] {
  return SPECS.map((spec) => buildLibrary(spec, scale))
}

// Counts the total tracks across a set of libraries (used by callers/tests).
export function countTracks(libraries: DemoLibrary[]): number {
  return libraries.reduce((sum, lib) =>
    sum + lib.artists.reduce((s, ar) => s + ar.albums.reduce((t, al) => t + al.tracks.length, 0), 0), 0)
}
