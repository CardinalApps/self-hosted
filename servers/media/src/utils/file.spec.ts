import { describe, test, expect, jest, afterEach } from '@jest/globals'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { statWithRetry } from './file'

describe('statWithRetry', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('returns stats for a readable file on the first attempt', async () => {
    const tmp = path.join(os.tmpdir(), `stat-retry-${process.pid}.tmp`)
    fs.writeFileSync(tmp, 'hello')

    const stats = await statWithRetry(tmp, 3, 1)

    expect(stats?.size).toBe(5)
    fs.rmSync(tmp)
  })

  test('retries through a transient failure', async () => {
    const tmp = path.join(os.tmpdir(), `stat-retry-transient-${process.pid}.tmp`)
    fs.writeFileSync(tmp, 'hello world')

    const realStat = fs.promises.stat
    let calls = 0
    jest.spyOn(fs.promises, 'stat').mockImplementation(((p: never) => {
      calls++
      if (calls === 1) {
        return Promise.reject(Object.assign(new Error('ENOENT: transient'), { code: 'ENOENT' }))
      }
      return realStat(p)
    }) as never)

    const stats = await statWithRetry(tmp, 3, 1)

    expect(stats?.size).toBe(11)
    expect(calls).toBe(2)
    fs.rmSync(tmp)
  })

  test('returns null after exhausting all attempts', async () => {
    let calls = 0
    jest.spyOn(fs.promises, 'stat').mockImplementation((() => {
      calls++
      return Promise.reject(Object.assign(new Error('ENOENT: gone'), { code: 'ENOENT' }))
    }) as never)

    const stats = await statWithRetry('/definitely/not/a/real/file.mp3', 3, 1)

    expect(stats).toBeNull()
    expect(calls).toBe(3)
  })
})
