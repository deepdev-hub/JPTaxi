import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { SavedPlaceType } from '../../../entities/customer-saved-place.entity';
import { StoredPaymentBrand } from '../../../entities/customer-payment-method.entity';

export class UpsertSavedPlaceDto {
  @IsEnum(SavedPlaceType)
  type: SavedPlaceType;

  @IsString()
  @Length(1, 60)
  label: string;

  @IsString()
  @Length(1, 255)
  address: string;

  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  longitude: number;
}

export class UpdateNotificationPreferencesDto {
  @IsBoolean()
  rideUpdates: boolean;

  @IsBoolean()
  emailNotifications: boolean;

  @IsBoolean()
  promotions: boolean;
}

export class CreatePaymentMethodDto {
  @IsEnum(StoredPaymentBrand)
  brand: StoredPaymentBrand;

  @IsString()
  @Length(1, 100)
  holderName: string;

  @IsString()
  @Matches(/^[\d\s-]{12,25}$/)
  cardNumber: string;

  @IsString()
  @Matches(/^\d{3,4}$/)
  securityCode: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth: number;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2200)
  expiryYear: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  billingAddress?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateSearchHistoryDto {
  @IsString()
  @Length(1, 255)
  searchText: string;

  @IsString()
  @Length(1, 120)
  name: string;

  @IsString()
  @Length(1, 255)
  address: string;

  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  longitude: number;
}
