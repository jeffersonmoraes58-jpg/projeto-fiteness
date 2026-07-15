import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/maintenance')
export class AdminMaintenanceController {
  constructor(private prisma: PrismaService) {}

  @Post('diagnose-orphans')
  @ApiOperation({ summary: 'Diagnosticar registros órfãos no banco' })
  async diagnoseOrphans() {
    const tables = [
      'trainer_students',
      'nutritionist_patients',
      'workout_plans',
      'workout_logs',
      'diet_plans',
      'meal_logs',
      'notifications',
      'refresh_tokens',
      'device_tokens',
    ];

    const results: Record<string, number> = {};

    for (const table of tables) {
      const result: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM ${table} WHERE student_id IS NOT NULL AND student_id NOT IN (SELECT id FROM students)`,
      );
      results[table] = Number(result[0]?.count ?? 0);
    }

    // Também verifica órfãos por userId (notifications, refresh_tokens, device_tokens)
    const userTables = ['notifications', 'refresh_tokens', 'device_tokens'];
    for (const table of userTables) {
      const result: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM ${table} WHERE user_id NOT IN (SELECT id FROM users)`,
      );
      results[`${table}_by_userid`] = Number(result[0]?.count ?? 0);
    }

    return {
      success: true,
      data: {
        orphansByTable: results,
        totalOrphans: Object.values(results).reduce((sum, v) => sum + v, 0),
        summary: {
          trainerStudentsOrphans: results['trainer_students'] ?? 0,
          nutritionistPatientsOrphans: results['nutritionist_patients'] ?? 0,
          workoutPlansOrphans: results['workout_plans'] ?? 0,
          workoutLogsOrphans: results['workout_logs'] ?? 0,
          dietPlansOrphans: results['diet_plans'] ?? 0,
          mealLogsOrphans: results['meal_logs'] ?? 0,
        },
      },
    };
  }

  @Post('clean-orphans')
  @ApiOperation({ summary: 'Remover registros órfãos do banco (IRREVERSÍVEL!)' })
  async cleanOrphans() {
    const deletions: Record<string, number> = {};

    // Ordenado para respeitar dependências (filhos primeiro)
    const queries = [
      { table: 'meal_logs', fk: 'student_id' },
      { table: 'diet_plans', fk: 'student_id' },
      { table: 'workout_logs', fk: 'student_id' },
      { table: 'workout_plans', fk: 'student_id' },
      { table: 'nutritionist_patients', fk: 'student_id' },
      { table: 'trainer_students', fk: 'student_id' },
    ];

    for (const { table, fk } of queries) {
      const result: any = await this.prisma.$executeRawUnsafe(
        `DELETE FROM ${table} WHERE ${fk} NOT IN (SELECT id FROM students)`,
      );
      deletions[table] = result;
    }

    // Limpa órfãos por userId
    const userTables = ['notifications', 'refresh_tokens', 'device_tokens'];
    for (const table of userTables) {
      const result: any = await this.prisma.$executeRawUnsafe(
        `DELETE FROM ${table} WHERE user_id NOT IN (SELECT id FROM users)`,
      );
      deletions[`${table}_by_userid`] = result;
    }

    return {
      success: true,
      data: {
        deletions,
        totalDeleted: Object.values(deletions).reduce((sum: number, v: number) => sum + v, 0),
      },
    };
  }
}