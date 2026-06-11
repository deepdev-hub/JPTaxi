import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsString, Length } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { MapService } from './map.service';

class GeocodeQuery {
  @IsString()
  @Length(2, 255)
  q: string;
}

class ReverseQuery {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;
}

class RouteBody {
  @Type(() => Number)
  @IsNumber()
  startLat: number;

  @Type(() => Number)
  @IsNumber()
  startLng: number;

  @Type(() => Number)
  @IsNumber()
  endLat: number;

  @Type(() => Number)
  @IsNumber()
  endLng: number;
}

@Controller('map')
@UseGuards(AuthGuard('jwt'))
export class MapController {
  constructor(private readonly maps: MapService) {}

  @Get('geocode')
  geocode(@Query() query: GeocodeQuery) {
    return this.maps.geocode(query.q);
  }

  @Get('reverse')
  reverse(@Query() query: ReverseQuery) {
    return this.maps.reverse(query.lat, query.lng);
  }

  @Post('route')
  route(@Body() body: RouteBody) {
    return this.maps.route(body.startLat, body.startLng, body.endLat, body.endLng);
  }
}
