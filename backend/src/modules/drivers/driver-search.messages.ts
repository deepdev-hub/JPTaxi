import { DriverJapaneseLevelEnum } from '../../entities/driver.entity';
import { VehicleTypeEnum } from '../../entities/vehicle.entity';
import { SearchDriversQueryDto } from './dto/search-drivers.query.dto';

export const DRIVER_SEARCH_NOTIFICATION_CODES = {
  NO_DRIVERS_IN_AREA: 'NO_DRIVERS_IN_AREA',
  NO_DRIVERS_MATCHING_FILTERS: 'NO_DRIVERS_MATCHING_FILTERS',
} as const;

export type DriverSearchNotificationCode =
  (typeof DRIVER_SEARCH_NOTIFICATION_CODES)[keyof typeof DRIVER_SEARCH_NOTIFICATION_CODES];

export interface DriverSearchNotification {
  code: DriverSearchNotificationCode;
  message: string;
  messageJa: string;
}

const VEHICLE_LABEL_VN: Record<VehicleTypeEnum, string> = {
  [VehicleTypeEnum.Four]: '4 chỗ',
  [VehicleTypeEnum.Seven]: '7 chỗ',
  [VehicleTypeEnum.Nine]: '9 chỗ',
};

const VEHICLE_LABEL_JA: Record<VehicleTypeEnum, string> = {
  [VehicleTypeEnum.Four]: '4人乗り',
  [VehicleTypeEnum.Seven]: '7人乗り',
  [VehicleTypeEnum.Nine]: '9人乗り',
};

function hasExtraFilters(q: SearchDriversQueryDto): boolean {
  return (
    q.vehicleType != null || q.minJapaneseLevel != null || q.minRating != null
  );
}

function filterSummaryJa(q: SearchDriversQueryDto): string {
  const parts: string[] = [];
  if (q.vehicleType != null) {
    parts.push(`車種（${VEHICLE_LABEL_JA[q.vehicleType]}）`);
  }
  if (q.minJapaneseLevel != null) {
    parts.push(`日本語レベル（${q.minJapaneseLevel}以上）`);
  }
  if (q.minRating != null) {
    parts.push(`評価（${q.minRating}つ星以上）`);
  }
  return parts.join('、');
}

function filterSummaryVn(q: SearchDriversQueryDto): string {
  const parts: string[] = [];
  if (q.vehicleType != null) {
    parts.push(`loại xe ${VEHICLE_LABEL_VN[q.vehicleType]}`);
  }
  if (q.minJapaneseLevel != null) {
    parts.push(`trình độ tiếng Nhật từ ${q.minJapaneseLevel} trở lên`);
  }
  if (q.minRating != null) {
    parts.push(`đánh giá từ ${q.minRating} sao trở lên`);
  }
  return parts.join(', ');
}

export function buildNoDriversNotification(
  q: SearchDriversQueryDto,
  driversInAreaWithoutFilters: number,
): DriverSearchNotification {
  const radiusKm = q.radiusKm ?? 10;

  if (driversInAreaWithoutFilters > 0 && hasExtraFilters(q)) {
    const filtersVn = filterSummaryVn(q);
    const filtersJa = filterSummaryJa(q);
    return {
      code: DRIVER_SEARCH_NOTIFICATION_CODES.NO_DRIVERS_MATCHING_FILTERS,
      message: `Có tài xế đang hoạt động gần đây nhưng không ai phù hợp với điều kiện lọc (${filtersVn}). Hãy nới lỏng bộ lọc hoặc mở rộng bán kính tìm kiếm (hiện tại ${radiusKm} km).`,
      messageJa: `近くに稼働中のドライバーはいますが、指定した条件（${filtersJa}）に一致する方がいません。条件を緩めるか、検索半径（現在${radiusKm}km）を広げてください。`,
    };
  }

  return {
    code: DRIVER_SEARCH_NOTIFICATION_CODES.NO_DRIVERS_IN_AREA,
    message: `Hiện không có tài xế phù hợp trong bán kính ${radiusKm} km quanh vị trí bạn. Vui lòng thử lại sau hoặc mở rộng khu vực tìm kiếm.`,
    messageJa: `現在地から半径${radiusKm}km以内に、条件に一致するドライバーが見つかりませんでした。しばらくしてから再度お試しいただくか、検索範囲を広げてください。`,
  };
}
