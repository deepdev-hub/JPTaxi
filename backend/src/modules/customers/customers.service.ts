import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { LoginHistory, LoginUserType } from '../../entities/login-history.entity';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CustomerSavedPlace } from '../../entities/customer-saved-place.entity';
import { CustomerNotificationPreference } from '../../entities/customer-notification-preference.entity';
import { CustomerPaymentMethod } from '../../entities/customer-payment-method.entity';
import { SearchHistory } from '../../entities/search-history.entity';
import {
  CreatePaymentMethodDto,
  CreateSearchHistoryDto,
  UpdateNotificationPreferencesDto,
  UpsertSavedPlaceDto,
} from './dto/customer-settings.dto';
import { tokenizeCard } from '../../common/payment-method.util';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(LoginHistory)
    private readonly logins: Repository<LoginHistory>,
    @InjectRepository(CustomerSavedPlace)
    private readonly savedPlaces: Repository<CustomerSavedPlace>,
    @InjectRepository(CustomerNotificationPreference)
    private readonly preferences: Repository<CustomerNotificationPreference>,
    @InjectRepository(CustomerPaymentMethod)
    private readonly paymentMethods: Repository<CustomerPaymentMethod>,
    @InjectRepository(SearchHistory)
    private readonly searchHistory: Repository<SearchHistory>,
  ) {}

  async getLoginHistory(customerId: number) {
    const rows = await this.logins.find({
      where: { userType: LoginUserType.customer, userId: customerId },
      order: { loginTime: 'DESC' },
      take: 20,
    });
    return rows.map((r) => ({
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      loginTime: r.loginTime,
    }));
  }

  async getProfile(customerId: number) {
    const c = await this.customers.findOne({ where: { customerId } });
    if (!c) throw new NotFoundException();
    const loginHistory = await this.getLoginHistory(customerId);
    return {
      lastName: c.lastName,
      firstName: c.firstName,
      email: c.email,
      gender: c.gender,
      phone: c.phone,
      birthDate: c.birthDate,
      createdAt: c.createdAt,
      avatarUrl: c.avatarUrl,
      loginHistory,
    };
  }

  async updateProfile(customerId: number, dto: UpdateCustomerProfileDto) {
    const c = await this.customers.findOne({ where: { customerId } });
    if (!c) throw new NotFoundException();
    c.lastName = dto.lastName;
    c.firstName = dto.firstName;
    c.gender = dto.gender;
    if (dto.birthDate != null && dto.birthDate !== '') {
      c.birthDate = dto.birthDate.slice(0, 10);
    }
    c.phone = dto.phone;
    c.email = dto.email;
    if (dto.avatarUrl !== undefined) c.avatarUrl = dto.avatarUrl;
    await this.customers.save(c);
    return this.getProfile(customerId);
  }

  getSavedPlaces(customerId: number) {
    return this.savedPlaces.find({
      where: { customerId },
      order: { savedPlaceId: 'ASC' },
    });
  }

  async upsertSavedPlace(customerId: number, dto: UpsertSavedPlaceDto) {
    let row = await this.savedPlaces.findOne({
      where: { customerId, type: dto.type },
    });
    row ??= this.savedPlaces.create({ customerId, type: dto.type });
    row.label = dto.label;
    row.address = dto.address;
    row.latitude = Number.isFinite(dto.latitude) ? String(dto.latitude) : null;
    row.longitude = Number.isFinite(dto.longitude) ? String(dto.longitude) : null;
    return this.savedPlaces.save(row);
  }

  async deleteSavedPlace(customerId: number, savedPlaceId: number) {
    const result = await this.savedPlaces.delete({ customerId, savedPlaceId });
    if (!result.affected) throw new NotFoundException('Saved place not found');
    return { deleted: true };
  }

  async getNotificationPreferences(customerId: number) {
    const existing = await this.preferences.findOne({ where: { customerId } });
    if (existing) return existing;
    return this.preferences.save(this.preferences.create({ customerId }));
  }

  async updateNotificationPreferences(
    customerId: number,
    dto: UpdateNotificationPreferencesDto,
  ) {
    const row = await this.getNotificationPreferences(customerId);
    Object.assign(row, dto);
    return this.preferences.save(row);
  }

  async getPaymentMethods(customerId: number) {
    const rows = await this.paymentMethods.find({
      where: { customerId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
    return rows.map(({ providerToken: _providerToken, ...row }) => row);
  }

  async addPaymentMethod(customerId: number, dto: CreatePaymentMethodDto) {
    let tokenized: ReturnType<typeof tokenizeCard>;
    try {
      tokenized = tokenizeCard(dto);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid payment method',
      );
    }
    const count = await this.paymentMethods.count({ where: { customerId } });
    const isDefault = dto.isDefault ?? count === 0;
    if (isDefault) {
      await this.paymentMethods.update({ customerId }, { isDefault: false });
    }
    const saved = await this.paymentMethods.save(
      this.paymentMethods.create({
        customerId,
        brand: dto.brand,
        holderName: dto.holderName.trim(),
        lastFour: tokenized.lastFour,
        expiryMonth: dto.expiryMonth,
        expiryYear: dto.expiryYear,
        billingAddress: dto.billingAddress?.trim() || null,
        providerToken: tokenized.providerToken,
        isDefault,
      }),
    );
    const { providerToken: _providerToken, ...safe } = saved;
    return safe;
  }

  async deletePaymentMethod(customerId: number, paymentMethodId: number) {
    const row = await this.paymentMethods.findOne({
      where: { customerId, paymentMethodId },
    });
    if (!row) throw new NotFoundException('Payment method not found');
    await this.paymentMethods.remove(row);
    if (row.isDefault) {
      const next = await this.paymentMethods.findOne({
        where: { customerId },
        order: { createdAt: 'ASC' },
      });
      if (next) {
        next.isDefault = true;
        await this.paymentMethods.save(next);
      }
    }
    return { deleted: true };
  }

  getSearchHistory(customerId: number) {
    return this.searchHistory.find({
      where: { customerId },
      order: { searchedAt: 'DESC' },
      take: 10,
    });
  }

  async addSearchHistory(customerId: number, dto: CreateSearchHistoryDto) {
    const row = await this.searchHistory.save(
      this.searchHistory.create({
        customerId,
        searchText: dto.searchText.trim(),
        metadata: {
          name: dto.name.trim(),
          address: dto.address.trim(),
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      }),
    );
    const oldRows = await this.searchHistory.find({
      where: { customerId },
      order: { searchedAt: 'DESC' },
      skip: 10,
    });
    if (oldRows.length) await this.searchHistory.remove(oldRows);
    return row;
  }

  async clearSearchHistory(customerId: number) {
    await this.searchHistory.delete({ customerId });
    return { deleted: true };
  }
}
