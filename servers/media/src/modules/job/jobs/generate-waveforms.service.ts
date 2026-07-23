import { Injectable, Scope } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { JobTask } from '../job-task.entity'

import { MusicTrack } from '../../music-track/music-track.entity'
import { WaveformService } from '../../waveform/waveform.service'
import { WAVEFORM_VERSION } from '../../waveform/analysis'

import { JobTaskStatus, JobTaskType } from '../enums'
import { JobProcessor } from '../types'

/**
 * The generate_waveforms job creates waveform data for music tracks.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class GenerateWaveformsJobService implements JobProcessor {
  constructor(
    @InjectRepository(JobTask)
    private jobTaskRepository: Repository<JobTask>,
    @InjectRepository(MusicTrack)
    private musicTrackRepository: Repository<MusicTrack>,
    private readonly waveformService: WaveformService,
  ) {}

  /**
   * A track needs work when it has no waveform, or its waveform was generated
   * by an older version of the analysis algorithm.
   */
  private tracksNeedingWaveformQuery(exclude: number[]) {
    const qb = this.musicTrackRepository
      .createQueryBuilder('track')
      .leftJoin('track.waveform', 'waveform')
      .where('(waveform.id IS NULL OR waveform.version < :version)', { version: WAVEFORM_VERSION })

    if (exclude.length) {
      qb.andWhere('track.id NOT IN (:...exclude)', { exclude })
    }

    return qb
  }

  /**
   * Count all tracks that need a waveform.
   */
  async countWork(exclude: number[]): Promise<number> {
    return await this.tracksNeedingWaveformQuery(exclude).getCount()
  }

  /**
   * Get a batch of tracks that need a waveform.
   */
  async getWork(exclude: number[], batchSize: number): Promise<number[]> {
    const batch = await this.tracksNeedingWaveformQuery(exclude)
      .select('track.id')
      .take(batchSize)
      .getMany()

    return batch.map(({ id }) => id)
  }

  /**
   * Generate the waveform for a single track.
   */
  async executeTask(task: JobTask): Promise<JobTask> {
    const musicTrackId = Number(task.target)

    await this.jobTaskRepository.update({ id: task.id }, {
      type: JobTaskType.GENERATE_TRACK_WAVEFORM,
      status: JobTaskStatus.RUNNING,
    } as Partial<JobTask>)

    try {
      await this.waveformService.generateForTrack(musicTrackId)
    } catch (error) {
      return await this._taskEnd(task, JobTaskStatus.ERRORED, {
        results: {
          message: error.message,
        },
      })
    }

    return await this._taskEnd(task, JobTaskStatus.COMPLETED)
  }

  /**
   * Write the status of the task after it's done.
   */
  async _taskEnd(task: JobTask, status: JobTaskStatus, other: Partial<JobTask> = {}): Promise<JobTask> {
    await this.jobTaskRepository.update({ id: task.id }, {
      status,
      ...other,
    })
    return await this.jobTaskRepository.findOne({ where: { id: task.id } })
  }
}
