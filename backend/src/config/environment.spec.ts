import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('rejects startup when required secrets are missing', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'development' })).toThrow(
      'DATABASE_URL',
    );
  });
});
