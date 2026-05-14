import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { AssignWorkoutDto } from './dto/assign-workout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('workouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private workoutsService: WorkoutsService) {}

  @Post()
  @Roles(UserRole.TRAINER)
  @ApiOperation({ summary: 'Criar novo treino' })
  create(@Body() dto: CreateWorkoutDto, @CurrentUser('id') userId: string) {
    return this.workoutsService.create(dto, userId);
  }

  @Get()
  @Roles(UserRole.TRAINER, UserRole.NUTRITIONIST)
  @ApiOperation({ summary: 'Listar treinos do trainer' })
  findAll(@CurrentUser('id') userId: string, @Query('search') search?: string) {
    return this.workoutsService.findAll(userId, search);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Listar templates de treino' })
  getTemplates(@Query('search') search?: string) {
    return this.workoutsService.getTemplates(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar treino por ID' })
  findOne(@Param('id') id: string) {
    return this.workoutsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.TRAINER)
  @ApiOperation({ summary: 'Atualizar treino (PUT)' })
  updatePut(@Param('id') id: string, @Body() dto: UpdateWorkoutDto) {
    return this.workoutsService.update(id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.TRAINER)
  @ApiOperation({ summary: 'Atualizar treino (PATCH)' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkoutDto) {
    return this.workoutsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.TRAINER)
  @ApiOperation({ summary: 'Deletar treino' })
  remove(@Param('id') id: string) {
    return this.workoutsService.remove(id);
  }

  @Post(':id/assign')
  @Roles(UserRole.TRAINER, UserRole.NUTRITIONIST)
  @ApiOperation({ summary: 'Atribuir treino a aluno' })
  assign(@Param('id') workoutId: string, @Body() dto: AssignWorkoutDto) {
    return this.workoutsService.assignToStudent(workoutId, dto);
  }

  @Delete('plans/:planId')
  @Roles(UserRole.TRAINER, UserRole.NUTRITIONIST)
  @ApiOperation({ summary: 'Remover plano de treino do aluno' })
  removePlan(@Param('planId') planId: string) {
    return this.workoutsService.removePlan(planId);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Treinos do aluno' })
  getStudentWorkouts(@Param('studentId') studentId: string) {
    return this.workoutsService.getStudentWorkouts(studentId);
  }

  @Get('student/:studentId/today')
  @ApiOperation({ summary: 'Treino de hoje do aluno' })
  getTodayWorkout(@Param('studentId') studentId: string) {
    return this.workoutsService.getTodayWorkout(studentId);
  }

  @Post('log')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Registrar log de treino' })
  logWorkout(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.workoutsService.logWorkout(body, userId);
  }
}
