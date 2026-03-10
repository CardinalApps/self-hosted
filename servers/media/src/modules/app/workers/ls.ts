import * as worker_threads from 'worker_threads'
import * as directoryTree from 'directory-tree'
import { remove } from 'lodash'

import { LsWorkerInput, LsWorkerOutput, LsEmptyNode } from '../types'

const {
  dir,
  depth = 1,
  removeFileNodes = false,
  addEmptyNodes = true,
}: LsWorkerInput = worker_threads.workerData

// FIXME
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const recursivelyAddEmptyNodes = (dirs: any[] | Record<string, any>) => {
  // Top level is an object
  if (!Array.isArray(dirs) && dirs?.type === 'directory' && dirs?.children) {
    recursivelyAddEmptyNodes(dirs.children)
  }
  // Other levels are arrays
  else if (Array.isArray(dirs)) {
    dirs.forEach((dir) => {
      if (dir?.children) {
        recursivelyAddEmptyNodes(dir)
      }
    })
    if (!dirs.length) {
      dirs.push({
        type: 'emptyNode',
      } as LsEmptyNode)
    }
  }
}

const recursivelyRemoveFiles = (dirs) => {
  // Top level is an object
  if (!Array.isArray(dirs) && dirs?.type === 'directory' && dirs?.children) {
    recursivelyRemoveFiles(dirs.children)
  }
  // Other levels are arrays
  else if (Array.isArray(dirs)) {
    dirs.forEach((dir) => {
      if (dir?.children) {
        recursivelyRemoveFiles(dir)
      }
    })
    remove(dirs, (dir) => dir?.type === 'file')
  }
}

/**
 * List the contents of a directory.
 */
function ls(): void {
  const output = directoryTree(dir, { depth, attributes: ['type'] })

  if (removeFileNodes) {
    recursivelyRemoveFiles(output)
  }

  if (addEmptyNodes) {
    recursivelyAddEmptyNodes(output)
  }

  worker_threads.parentPort.postMessage(output as unknown as LsWorkerOutput)
}

ls()
