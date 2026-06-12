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
    const payload = await this.requestJson<unknown>(
      `${this.nominatim}/search?${params}`,
    );
    return Array.isArray(payload)
      ? payload.map((item) => this.normalizePlace(item)).filter(Boolean)
      : [];
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
    const payload = await this.requestJson<unknown>(
      `${this.nominatim}/reverse?${params}`,
    );
    const place = this.normalizePlace(payload);
    if (!place) throw new BadGatewayException('Map provider returned an invalid place');
    return place;
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

  private normalizePlace(value: unknown) {
    if (!value || typeof value !== 'object') return null;
    const item = value as Record<string, unknown>;
    const latitude = Number(item.lat ?? item.latitude);
    const longitude = Number(item.lon ?? item.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    const details =
      item.address && typeof item.address === 'object'
        ? (item.address as Record<string, unknown>)
        : {};
    const displayName =
      typeof item.display_name === 'string' ? item.display_name.trim() : '';
    const address = displayName || this.addressFromDetails(details);
    const nameCandidates = [
      item.name,
      details.amenity,
      details.building,
      details.house_name,
      details.road,
      address.split(',')[0],
    ];
    const name = nameCandidates.find(
      (candidate): candidate is string =>
        typeof candidate === 'string' && candidate.trim().length > 0,
    );

    return {
      placeId: item.place_id ?? item.placeId ?? `${latitude}:${longitude}`,
      name: name?.trim() || 'Selected place',
      address,
      latitude,
      longitude,
    };
  }

  private addressFromDetails(details: Record<string, unknown>): string {
    const preferredKeys = [
      'amenity',
      'house_number',
      'road',
      'neighbourhood',
      'suburb',
      'city',
      'town',
      'village',
      'state',
      'postcode',
      'country',
    ];
    const parts = preferredKeys
      .map((key) => details[key])
      .filter(
        (part): part is string =>
          typeof part === 'string' && part.trim().length > 0,
      )
      .map((part) => part.trim());
    return [...new Set(parts)].join(', ');
  }

  private get nominatim(): string {
    return this.config.getOrThrow<string>('NOMINATIM_BASE_URL').replace(/\/$/, '');
  }

  private get osrm(): string {
    return this.config.getOrThrow<string>('OSRM_BASE_URL').replace(/\/$/, '');
  }
}
