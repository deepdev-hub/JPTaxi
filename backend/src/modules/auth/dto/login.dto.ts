import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsOptional()
  @IsIn(['customer', 'driver'])
  role?: 'customer' | 'driver';
}
