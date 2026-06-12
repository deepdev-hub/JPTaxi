import { ConfigService } from '@nestjs/config';
import { MapService } from './map.service';

describe('MapService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes Nominatim address objects into renderable place strings', async () => {
    const config = {
      getOrThrow: jest.fn((key: string) =>
        key === 'NOMINATIM_BASE_URL'
          ? 'https://nominatim.example'
          : 'https://osrm.example',
      ),
    } as unknown as ConfigService;
    const service = new MapService(config);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 10,
          lat: '21.0285',
          lon: '105.8520',
          display_name: 'Hoan Kiem Lake, Hanoi, Vietnam',
          address: {
            amenity: 'Hoan Kiem Lake',
            city: 'Hanoi',
            country: 'Vietnam',
          },
        },
      ],
    } as Response);

    await expect(service.geocode('Hoan Kiem')).resolves.toEqual([
      expect.objectContaining({
        placeId: 10,
        latitude: 21.0285,
        longitude: 105.852,
        name: 'Hoan Kiem Lake',
        address: 'Hoan Kiem Lake, Hanoi, Vietnam',
      }),
    ]);
  });
});
