import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { RideService } from './ride.service';

@Injectable()
export class DispatchSchedulerService implements OnModuleDestroy {
  private running = false;
  private shuttingDown = false;

  constructor(
    private readonly rides: RideService,
    private readonly config: ConfigService,
  ) {}

  onModuleDestroy(): void {
    this.shuttingDown = true;
  }

  @Interval(500)
  async tick(): Promise<void> {
    const enabled = this.config.get<boolean>(
      'DISPATCH_SCHEDULER_ENABLED',
      true,
    );
    if (!enabled || this.shuttingDown || this.running) return;

    this.running = true;
    try {
      await this.rides.processDispatchCycle();
    } catch (error) {
      if (!this.shuttingDown) throw error;
    } finally {
      this.running = false;
    }
  }
}
