import { MessagesService } from './messages.service';

describe('MessagesService schema ownership', () => {
  it('does not mutate the database schema during module initialization', () => {
    expect('onModuleInit' in MessagesService.prototype).toBe(false);
  });
});
