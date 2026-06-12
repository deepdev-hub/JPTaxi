import { HttpStatus } from '@nestjs/common';
import { apiErrorCodeForStatus } from './api-exception.filter';

describe('apiErrorCodeForStatus', () => {
  it('maps HTTP status values to stable API error codes', () => {
    expect(apiErrorCodeForStatus(HttpStatus.UNAUTHORIZED)).toBe('UNAUTHORIZED');
    expect(apiErrorCodeForStatus(HttpStatus.UNPROCESSABLE_ENTITY)).toBe(
      'VALIDATION_ERROR',
    );
    expect(apiErrorCodeForStatus(HttpStatus.INTERNAL_SERVER_ERROR)).toBe(
      'INTERNAL_ERROR',
    );
  });
});
