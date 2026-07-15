import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminMaintenanceController } from './admin-maintenance.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController, AdminMaintenanceController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

