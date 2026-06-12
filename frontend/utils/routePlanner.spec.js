import { describe, expect, it } from 'vitest';
import { formatDuration } from './routePlanner.js';

describe('formatDuration', () => {
  it('uses the selected locale for the duration unit', () => {
    expect(formatDuration(2_400, 5_000, 'en-US')).toBe('46 min');
    expect(formatDuration(2_400, 5_000, 'vi-VN')).toBe('46 phút');
    expect(formatDuration(2_400, 5_000, 'ja-JP')).toBe('46分');
  });
});
