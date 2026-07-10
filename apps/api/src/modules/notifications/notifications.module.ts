import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsScheduler } from './notifications.scheduler';
import { EmailModule } from '../email/email.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [EmailModule, PushModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}

