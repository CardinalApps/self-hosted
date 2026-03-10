import { Job } from './job.entity'
import { JobTask } from './job-task.entity'

import { ThumbnailSizes } from '../thumbnail/types'

import { JobTaskType } from './enums'

/**
 * JobProcessor shapes the logic of the job.
 */
export interface JobProcessor {
  /**
   * Analyzes the database to determine how much work is left to do.
   */
  countWork: (exclude: number[], batchSize: number) => Promise<number>

  /**
   * Gets a batch of remaining work.
   * 
   * @param [exclude] - Array of IDs to not include in the remaining work
   * (typically because they have already been tried and failed).
   * @param [batchSize] - How many database entries to return.
   * @returns Each item returned in the array will be stringified and set as the
   * "target" of each eventual JobTask.
   */
  getWork: (exclude: number[], batchSize: number) => Promise<string | number[]>

  /**
   * Prepares a job by analyzing the job parameters and the user's indexed
   * files, and creates all the necessary tasks to complete the job.
   * 
   * @deprecated
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prepareJob?: (job: Job) => any

  /**
   * Does the work of a single task in the job. The JobTask that is returned
   * should be in its final, completed state, and should have already been
   * written to the database.
   */
  executeTask?: (task: JobTask) => Promise<JobTask>
}

/**
 * Job tasks can produce results objects of many different shapes.
 */
export type JobTaskResults = {
  'message'?: string,
  [key: string]: unknown,
}

/**
 * Parameters for job task:
 * 
 *    create_photo_thumbnail
 */
export interface JobTaskParams_CreatePhotoThumbnail {
  type: JobTaskType.CREATE_PHOTO_THUMBNAIL,
  size: ThumbnailSizes,
  quality: number,
}

/**
 * Parameters for job task:
 * 
 *    heic_to_jpeg
 */
export interface JobTaskParams_HeicToJpeg {
  type: JobTaskType.HEIC_TO_JEPG,
  quality: number,
}

/**
 * Union of all job task parameters.
 */
export type JobTaskParams =
    JobTaskParams_CreatePhotoThumbnail
  | JobTaskParams_HeicToJpeg
