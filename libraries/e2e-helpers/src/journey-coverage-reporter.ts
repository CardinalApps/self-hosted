import * as fs from 'node:fs'
import * as path from 'node:path'
import type {
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter'
import type { Journey } from './journeys'
import { parseJourneyTags } from './journeys'

type TestStatus = TestResult['status'] | 'pending'

interface TestEntry {
  title: string
  file: string
  status: TestStatus
}

interface JourneyEntry {
  journeyId: string
  name: string
  tests: TestEntry[]
}

// Reads `@journey:<id>` tags on each test and prints a coverage checklist
// after the run. The per-app catalog of journeys is injected at construction
// so the reporter stays generic — each app's reporter file is a one-liner
// that hands its JOURNEYS to this class.
export class JourneyCoverageReporter implements Reporter {
  private rootSuite?: Suite
  private testResults = new Map<TestCase, TestResult>()

  constructor(private readonly journeys: Journey[]) {}

  onBegin(_config: unknown, suite: Suite): void {
    this.rootSuite = suite
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.testResults.set(test, result)
  }

  onEnd(): void {
    if (!this.rootSuite) return

    const cwd = process.cwd()
    const allTests = this.rootSuite.allTests()

    const known = new Map<string, JourneyEntry>()
    for (const j of this.journeys) {
      known.set(j.id, { journeyId: j.id, name: j.name, tests: [] })
    }
    const undeclared = new Map<string, JourneyEntry>()
    const untagged: TestEntry[] = []

    for (const test of allTests) {
      const journeyIds = parseJourneyTags(test.tags)
      const result = this.testResults.get(test)
      const entry: TestEntry = {
        title: test.title,
        file: path.relative(cwd, test.location.file),
        status: result?.status ?? 'pending',
      }
      if (journeyIds.length === 0) {
        untagged.push(entry)
        continue
      }
      for (const id of journeyIds) {
        const bucket = known.get(id) ?? undeclared.get(id) ?? (() => {
          const fresh: JourneyEntry = { journeyId: id, name: '(undeclared)', tests: [] }
          undeclared.set(id, fresh)
          return fresh
        })()
        bucket.tests.push(entry)
      }
    }

    const covered = [...known.values()].filter((j) => j.tests.length > 0)
    const uncovered = [...known.values()].filter((j) => j.tests.length === 0)

    const lines: string[] = []
    lines.push('')
    lines.push('User journey coverage')
    lines.push('=====================')
    for (const j of [...covered, ...uncovered]) {
      const marker = markerFor(j)
      const count = j.tests.length === 0
        ? 'no tests'
        : `${j.tests.length} test${j.tests.length === 1 ? '' : 's'}`
      lines.push(`  ${marker} ${j.journeyId.padEnd(28)} ${j.name}  (${count})`)
    }

    if (undeclared.size > 0) {
      lines.push('')
      lines.push('Undeclared journeys (tagged in a test but missing from journeys.ts):')
      for (const j of undeclared.values()) {
        lines.push(`  [?] ${j.journeyId}  (${j.tests.length} test${j.tests.length === 1 ? '' : 's'})`)
      }
    }

    if (untagged.length > 0) {
      lines.push('')
      lines.push(`Untagged tests (no @journey:* tag): ${untagged.length}`)
      for (const t of untagged) {
        lines.push(`  - ${t.file}: ${t.title}`)
      }
    }

    const coveragePercent = this.journeys.length > 0
      ? Math.round((covered.length / this.journeys.length) * 100)
      : 0
    lines.push('')
    lines.push(`Coverage: ${covered.length}/${this.journeys.length} journeys (${coveragePercent}%)`)
    lines.push('')

    process.stdout.write(lines.join('\n') + '\n')

    // Persist JSON for CI consumption / dashboards. Reporters are loaded from
    // each app's e2e/ tree, so __dirname here is the consumer's reporter file
    // location — its sibling test-results/ directory is the right home.
    const callerDir = process.cwd()
    const outDir = path.resolve(callerDir, 'e2e', 'test-results')
    try {
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(
        path.join(outDir, 'journey-coverage.json'),
        JSON.stringify(
          {
            totalJourneys: this.journeys.length,
            coveredJourneys: covered.length,
            coveragePercent,
            covered,
            uncovered: uncovered.map((j) => ({ journeyId: j.journeyId, name: j.name })),
            undeclared: [...undeclared.values()],
            untagged,
          },
          null,
          2,
        ),
      )
    } catch {
      // Best effort — don't fail the run if the JSON sidecar can't be written.
    }
  }
}

// Marker glyph for the coverage line of a single journey.
function markerFor(j: JourneyEntry): string {
  if (j.tests.length === 0) return '[ ]'
  const anyFailed = j.tests.some((t) => t.status === 'failed' || t.status === 'timedOut' || t.status === 'interrupted')
  return anyFailed ? '[!]' : '[x]'
}
