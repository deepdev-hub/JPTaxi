import { ForbiddenException } from '@nestjs/common';
import { DriverStatusType } from '../entities/driver.entity';

export function assertDriverMayLogin(status: DriverStatusType): void {
  if (status === DriverStatusType.approved) {
    return;
  }
  if (status === DriverStatusType.pending) {
    throw new ForbiddenException(
      'アカウントは審査中です。承認後にログインできます',
    );
  }
  if (status === DriverStatusType.rejected) {
    throw new ForbiddenException('アカウントは承認されていません');
  }
  if (status === DriverStatusType.suspended) {
    throw new ForbiddenException('アカウントは停止されています');
  }
}
