import cron from 'node-cron';

import { createModuleLogger } from '../../logging';

import type { ScheduledTask } from 'node-cron';

const logger = createModuleLogger('cron');

export interface CronJob {
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  enabled: boolean;
}

export interface CronService {
  register(job: CronJob): void;
  start(): void;
  stop(): void;
  runNow(jobName: string): Promise<void>;
}

interface RegisteredJob {
  job: CronJob;
  task: ScheduledTask | null;
}

const jobs = new Map<string, RegisteredJob>();

export const cronService: CronService = {
  register(job: CronJob): void {
    if (jobs.has(job.name)) {
      logger.warn({ jobName: job.name }, 'Job already registered, skipping');
      return;
    }

    if (!cron.validate(job.schedule)) {
      logger.error({ jobName: job.name, schedule: job.schedule }, 'Invalid cron expression');
      return;
    }

    jobs.set(job.name, { job, task: null });
    logger.info(
      { jobName: job.name, schedule: job.schedule, enabled: job.enabled },
      'Job registered',
    );
  },

  start(): void {
    for (const [name, registered] of jobs) {
      if (!registered.job.enabled) {
        logger.debug({ jobName: name }, 'Job is disabled, skipping');
        continue;
      }

      if (registered.task) {
        logger.debug({ jobName: name }, 'Job already started, skipping');
        continue;
      }

      const task = cron.schedule(registered.job.schedule, async () => {
        const startTime = Date.now();
        logger.info({ jobName: name }, 'Job started');

        try {
          await registered.job.handler();
          const duration = Date.now() - startTime;
          logger.info({ jobName: name, durationMs: duration }, 'Job completed');
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error({ jobName: name, error, durationMs: duration }, 'Job failed');
        }
      });

      registered.task = task;
      logger.info({ jobName: name }, 'Job started');
    }
  },

  stop(): void {
    for (const [name, registered] of jobs) {
      if (registered.task) {
        registered.task.stop();
        registered.task = null;
        logger.info({ jobName: name }, 'Job stopped');
      }
    }
  },

  async runNow(jobName: string): Promise<void> {
    const registered = jobs.get(jobName);

    if (!registered) {
      logger.warn({ jobName }, 'Job not found');
      return;
    }

    const startTime = Date.now();
    logger.info({ jobName }, 'Manual job execution started');

    try {
      await registered.job.handler();
      const duration = Date.now() - startTime;
      logger.info({ jobName, durationMs: duration }, 'Manual job execution completed');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ jobName, error, durationMs: duration }, 'Manual job execution failed');
      throw error;
    }
  },
};
