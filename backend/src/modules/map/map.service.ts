import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MapService {
  constructor(private readonly config: ConfigService) {}

  async geocode(query: string) {
    const text = query.trim();
    if (text.length < 2) throw new BadRequestException('Search query is too short');
    const params = new URLSearchParams({
      q: text,
      format: 'json',
      limit: '6',
      addressdetails: '1',
      namedetails: '1',
      'accept-language': 'ja,vi;q=0.8,en;q=0.6',
    });
    return this.requestJson(`${this.nominatim}/search?${params}`);
  }

  async reverse(latitude: number, longitude: number) {
    this.assertCoordinates(latitude, longitude);
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'json',
      addressdetails: '1',
      namedetails: '1',
      'accept-language': 'ja,vi;q=0.8,en;q=0.6',
    });
    return this.requestJson(`${this.nominatim}/reverse?${params}`);
  }

  async route(startLat: number, startLng: number, endLat: number, endLng: number) {
    this.assertCoordinates(startLat, startLng);
    this.assertCoordinates(endLat, endLng);
    const params = new URLSearchParams({
      overview: 'full',
      geometries: 'geojson',
      steps: 'true',
    });
    const payload = await this.requestJson<any>(
      `${this.osrm}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?${params}`,
    );
    const route = payload?.routes?.[0];
    if (!route) throw new BadGatewayException('Routing provider returned no route');
    return {
      distanceMeters: Number(route.distance),
      durationSeconds: Number(route.duration),
      path: (route.geometry?.coordinates ?? []).map(
        ([lng, lat]: [number, number]) => [lat, lng],
      ),
    };
  }

  private async requestJson<T = unknown>(url: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': 'JP-Taxi-Local/1.0' },
        signal: AbortSignal.timeout(12_000),
      });
    } catch {
      throw new BadGatewayException('Map provider is unavailable');
    }
    if (!response.ok) throw new BadGatewayException('Map provider request failed');
    return response.json() as Promise<T>;
  }

  private assertCoordinates(latitude: number, longitude: number) {
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new BadRequestException('Invalid coordinates');
    }
  }

  private get nominatim(): string {
    return this.config.getOrThrow<string>('NOMINATIM_BASE_URL').replace(/\/$/, '');
  }

  private get osrm(): string {
    return this.config.getOrThrow<string>('OSRM_BASE_URL').replace(/\/$/, '');
  }
}
