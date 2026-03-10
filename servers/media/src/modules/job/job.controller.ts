import {
  Controller,
  Body,
  Get,
  Post,
  Patch,
  Query,
  Param,
  ParseArrayPipe,
  InternalServerErrorException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger'
import { Repository } from 'typeorm'

import { JobStatus, JobType } from './enums'

import { Job } from './job.entity'
import { JobTask } from './job-task.entity'
import { JobService } from './job.service'

import { UpdateJobDto } from './dtos/UpdateJob.dto'
import { CreateJobDto } from './dtos/CreateJob.dto'
import { GetJobsDto } from './dtos/GetJobs.dto'
import { GetJobTasksDto } from './dtos/GetJobTasks.dto'
import { JobQueueService } from './job-queue.service'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller()
@ApiTags('Jobs')
export class JobController {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    private readonly jobService: JobService,
    private readonly jobQueueService: JobQueueService,
  ) {}

  /**
   * Create a new job and automatically runs it.
   */
  @Post('/job')
  @StandardEndpoint({
    summary: 'Create a new job.',
    description: 'The job will automatically start running.',
    capabilities: ['Jobs.Create'],
  })
  async createJob(@Body() createJobDto: CreateJobDto): Promise<Job> {
    const job = await this.jobService.createJob({
      createJobDto,
    })
    return job
  }

  /**
   * Query, sort, and filter server jobs.
   */
  @Get('/jobs')
  @StandardEndpoint({
    summary: 'Fetch server jobs.',
    capabilities: ['Jobs.Read'],
  })
  @ApiQuery({ name: 'status', isArray: true, description: Object.values(JobStatus).join(', ') })
  @ApiQuery({ name: 'type', isArray: true, description: Object.values(JobType).join(', ') })
  async getJobs(
    @Query() getJobsDto: GetJobsDto,
    @Query('status', new ParseArrayPipe({ items: String, separator: ',', optional: true })) status: JobStatus[],
    @Query('type', new ParseArrayPipe({ items: String, separator: ',', optional: true })) type: JobType[],
  ) {
    const results = await this.jobService.getJobs({
      getJobsDto,
      status,
      type,
    })
    return results
  }

  /**
   * Get a single job by ID.
   */
  @Get('/job/:id')
  @StandardEndpoint({
    summary: 'Get a single job.',
    capabilities: ['Jobs.Read'],
  })
  async getJob(@Param('id') id: number) {
    const job = await this.jobService.getJob(id, { tasks: false })
    return job
  }

  /**
   * Control a job.
   */
  @Patch('/job/:id')
  @StandardEndpoint({
    summary: 'Control a job.',
    description: `Control a job by updating its status. Pausing will only kick in between the next job tasks, resuming is instant.`,
    capabilities: ['Jobs.Operate'],
  })
  async updateJob(@Param('id') id: number, @Body() updateJobDto: UpdateJobDto): Promise<Job> {
    const result = await this.jobService.updateJob(id, { ...updateJobDto })
    if (!result) {
      throw new InternalServerErrorException()
    }
    return result
  }

  /**
   * Get all the tasks of a job.
   */
  @Get('/job/:id/tasks')
  @StandardEndpoint({
    summary: "Get a job's tasks.",
    capabilities: ['Jobs.Read'],
  })
  async getJobTasks(@Param('id') id: number, @Query() query: GetJobTasksDto): Promise<[JobTask[], number]> {
    const pagination = { take: query.take, skip: query.skip }
    return await this.jobService.getJobTasks(id, query.type, pagination)
  }

  /**
   * Stops an active job.
   */
  // @Delete('/job/:id')
  // @UseGuards(AuthGuard)
  // @ApiTags('Jobs')
  // @ApiOperation({ summary: 'Stop an active job.' })
  // @ApiOkResponse({
  //   status: 200,
  //   description: 'Returns the state of the job before it was stopped.',
  // })
  // @ApiSecurity(ApiSecurityTypes.LOCAL_USER_JWT)
  // async deleteJob(@Param() { id }): Promise<Record<string, boolean> | boolean> {
  //   if (query.ids.length === 1 && query.ids[0] === '*' && query.hardDelete) {
  //     await this.indexingService.deleteAllIndexedData()
  //     return true
  //   } else {
  //     return await this.indexingService.deindexFiles(query.ids, query.hardDelete)
  //   }
  //   return true
  // }

  /**
   * Get all job types.
   */
  @Get('/jobs/types')
  @StandardEndpoint({
    summary: "Get all job types.",
    capabilities: ['Jobs.Read'],
  })
  async getJobTypes() {
    return Object.values(JobType)
  }
}
