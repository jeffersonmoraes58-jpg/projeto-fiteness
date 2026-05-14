import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MealsService } from './meals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('meals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealsController {
  constructor(private service: MealsService) {}
}

