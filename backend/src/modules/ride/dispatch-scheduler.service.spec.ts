import { ConfigService } from '@nestjs/config';
import { DispatchSchedulerService } from './dispatch-scheduler.service';
import { RideService } from './ride.service';

describe('DispatchSchedulerService', () => {
  it('does not process dispatch cycles when the scheduler is disabled', async () => {
    const rides = {
      processDispatchCycle: jest.fn(),
    } as unknown as RideService;
    const config = {
      get: jest.fn().mockReturnValue(false),
    } as unknown as ConfigService;
    const scheduler = new DispatchSchedulerService(rides, config);

    await scheduler.tick();

    expect(rides.processDispatchCycle).not.toHaveBeenCalled();
  });

  it('processes dispatch cycles when the scheduler is enabled', async () => {
    const rides = {
      processDispatchCycle: jest.fn().mockResolvedValue(undefined),
    } as unknown as RideService;
    const config = {
      get: jest.fn().mockReturnValue(true),
    } as unknown as ConfigService;
    const scheduler = new DispatchSchedulerService(rides, config);

    await scheduler.tick();

    expect(rides.processDispatchCycle).toHaveBeenCalledTimes(1);
  });
});
