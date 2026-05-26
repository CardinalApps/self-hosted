import * as fs from 'fs'
import * as path from 'path'
import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { IndexingStates, RunLogEvent, RunType } from '../../../src/modules/indexing/enums'

/*
  Metadata-robustness integration suite — opt-in via CARDINAL_TEST_REAL_MUSIC_DIR.

  The goal here is *not* correctness of extracted metadata; it's bounded
  liveness. Real-world collections contain files with weird ID3 tags, mixed
  character sets, missing/garbled frames, and outright corruption. Past
  regressions have caused the indexer to hang on a single bad file, taking
  down a run.

  Approach:
    1. Enumerate every supported music file under the target dir.
    2. Run one full indexing pass, bounded by (PER_FILE_TIMEOUT_MS * files).
    3. After idle, walk run-logs once and bucket entries by filePath.
    4. One test per file asserts a log entry exists with one of the
       terminal events (indexed / updated / skipped / errored). Anything
       else — most commonly "no entry at all" — means the indexer hung
       on (or before) that file and never moved on.

  The failure mode is informative on its own: if the indexer hung on file N,
  files N..end will all fail with "no run-log entry — indexer may have hung."
  The first failing file in source order is the culprit.

  Configure with:
    - CARDINAL_TEST_REAL_MUSIC_DIR=<absolute path>           (required to run)
    - CARDINAL_TEST_PER_FILE_TIMEOUT_MS=<ms per file>        (default 10000)
*/

// eslint-disable-next-line turbo/no-undeclared-env-vars
const REAL_MUSIC_DIR = process.env.CARDINAL_TEST_REAL_MUSIC_DIR
const PER_FILE_TIMEOUT_MS = Number(
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.CARDINAL_TEST_PER_FILE_TIMEOUT_MS ?? 10_000,
)

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.flac', '.m4a', '.wav', '.aac', '.opus'])
const TERMINAL_FILE_EVENTS = new Set<string>([
  RunLogEvent.FILE_INDEXED,
  RunLogEvent.FILE_UPDATED,
  RunLogEvent.FILE_SKIPPED,
  RunLogEvent.FILE_ERRORED,
])

// Walks `dir` recursively and returns absolute paths of every file whose
// extension is in the supported set. Cheap to call at module load.
function listMusicFiles(dir: string): string[] {
  const out: string[] = []
  const stack = [dir]
  while (stack.length) {
    const current = stack.pop()!
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          out.push(full)
        }
      }
    }
  }
  out.sort()
  return out
}

const MUSIC_FILES = REAL_MUSIC_DIR ? listMusicFiles(REAL_MUSIC_DIR) : []

// Polls until the indexing service goes idle, or rejects after `timeoutMs`.
async function waitForIdleState(
  server: ReturnType<TestApp['app']['getHttpServer']>,
  authToken: string,
  timeoutMs: number,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 250))
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    const res = await request(server).get('/api/v1/index/state').set('Authorization', `Bearer ${authToken}`)
    if (res.body && res.body.state === IndexingStates.IDLE) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(
    `Indexing did not reach idle within ${timeoutMs}ms — the most recent file in the run logs is likely the one that hung the indexer.`,
  )
}

// Pages through /index/run/logs?runId=... until every entry is collected.
async function fetchAllRunLogs(
  server: ReturnType<TestApp['app']['getHttpServer']>,
  authToken: string,
  runId: string,
): Promise<Array<{ event: string, filePath: string | null }>> {
  const PAGE = 500
  const collected: Array<{ event: string, filePath: string | null }> = []
  let skip = 0
  while (true) {
    const res = await request(server)
      .get('/api/v1/index/run/logs')
      .query({ runId, take: PAGE, skip })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
    const [rows, total] = res.body as [Array<{ event: string, filePath: string | null }>, number]
    collected.push(...rows)
    skip += rows.length
    if (rows.length === 0 || collected.length >= total) {
      break
    }
  }
  return collected
}

// Gate the whole suite on the env var. When unset, `describe.skip` keeps CI
// quiet — the suite needs a user-supplied collection on disk to run.
const describeMaybe = REAL_MUSIC_DIR && MUSIC_FILES.length > 0 ? describe : describe.skip

describeMaybe(`metadata robustness (${MUSIC_FILES.length} files in ${REAL_MUSIC_DIR ?? '<unset>'})`, () => {
  let testApp: TestApp
  let authToken: string
  let entriesByFilePath: Map<string, { event: string }>

  beforeAll(async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env.MUSIC_DIR = REAL_MUSIC_DIR

    testApp = await createTestApp()

    await request(testApp.app.getHttpServer())
      .post('/api/v1/setup')
      .send({ serverName: 'Robustness Test Server', theme: 'dark', sendAnonymousUsageData: false })

    const userService = testApp.moduleRef.get(UserService)
    const guestAccount = await userService.getGuestAccount()

    const loginRes = await request(testApp.app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('cardinal-app', 'admin')
      .send({ userId: guestAccount.userId })
      .expect(201)
    authToken = loginRes.body.JWT

    const runRes = await request(testApp.app.getHttpServer())
      .post('/api/v1/index/run')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: RunType.FULL, indexMusic: true, indexPhotos: false, indexMovies: false, indexTV: false })
      .expect(201)
    const runId: string = runRes.body.runId

    // Generous bound: per-file timeout × file count + a small constant for
    // setup/teardown overhead.
    const totalTimeout = (PER_FILE_TIMEOUT_MS * MUSIC_FILES.length) + 30_000
    await waitForIdleState(testApp.app.getHttpServer(), authToken, totalTimeout)

    const rows = await fetchAllRunLogs(testApp.app.getHttpServer(), authToken, runId)
    entriesByFilePath = new Map()
    for (const row of rows) {
      if (row.filePath && TERMINAL_FILE_EVENTS.has(row.event)) {
        entriesByFilePath.set(row.filePath, { event: row.event })
      }
    }
    // The total time budget is the per-test timeout for this beforeAll.
  }, (PER_FILE_TIMEOUT_MS * Math.max(MUSIC_FILES.length, 1)) + 60_000)

  afterAll(async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    delete process.env.MUSIC_DIR
    if (testApp) {
      await destroyTestApp(testApp)
    }
  })

  it.each(MUSIC_FILES)(
    'reached a terminal state without hanging: %s',
    (filePath) => {
      const entry = entriesByFilePath.get(filePath)
      if (!entry) {
        throw new Error(
          `No run-log entry for ${filePath}. The indexer likely hung on this file (or one before it in source order). Inspect the previous test's last-seen file to find the boundary.`,
        )
      }
      expect(TERMINAL_FILE_EVENTS.has(entry.event)).toBe(true)
    },
  )
})
