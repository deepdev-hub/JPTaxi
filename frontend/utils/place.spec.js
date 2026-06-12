import { describe, expect, it } from 'vitest';
import { normalizePlace } from './place.js';

describe('normalizePlace', () => {
  it('turns structured address data into a React-safe string', () => {
    expect(normalizePlace({
      place_id: 42,
      lat: '21.0285',
      lon: '105.8520',
      address: {
        amenity: 'Hoan Kiem Lake',
        road: 'Le Thai To',
        city: 'Hanoi',
        country: 'Vietnam',
      },
    })).toEqual({
      id: 42,
      name: 'Hoan Kiem Lake',
      address: 'Hoan Kiem Lake, Le Thai To, Hanoi, Vietnam',
      position: [21.0285, 105.852],
    });
  });
});
