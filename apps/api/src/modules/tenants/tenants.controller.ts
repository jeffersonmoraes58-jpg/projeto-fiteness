import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private service: TenantsService) {}

  @Get('my/overview')
  getOverview(@CurrentUser('tenantId') tenantId: string) {
    return this.service.getOverview(tenantId);
  }

  @Patch('my')
  updateMyTenant(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { name?: string },
  ) {
    return this.service.updateTenant(tenantId, body);
  }

  @Get('my/members')
  getMembers(
    @CurrentUser('tenantId') tenantId: string,
    @Query('role') role?: string,
  ) {
    return this.service.getMembers(tenantId, role);
  }

  @Delete('my/members/:userId')
  removeMember(
    @CurrentUser('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.removeMember(tenantId, userId);
  }
}
