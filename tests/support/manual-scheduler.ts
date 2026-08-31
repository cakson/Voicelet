import type { Clock, ScheduledWork, Scheduler } from '../../src/ports/index.js';

export class ManualScheduler implements Clock, Scheduler {
  private time = 0;
  private readonly jobs: Array<{ at: number; cancelled: boolean; callback: () => void }> = [];

  now(): Date {
    return new Date(this.time);
  }

  schedule(delayMs: number, callback: () => void): ScheduledWork {
    const job = { at: this.time + delayMs, cancelled: false, callback };
    this.jobs.push(job);
    return { cancel: () => (job.cancelled = true) };
  }

  async advanceBy(delayMs: number): Promise<void> {
    this.time += delayMs;
    for (const job of this.jobs.filter((item) => !item.cancelled && item.at <= this.time)) {
      job.cancelled = true;
      job.callback();
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}
