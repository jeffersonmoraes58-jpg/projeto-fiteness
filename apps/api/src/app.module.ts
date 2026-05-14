import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TrainersModule } from './modules/trainers/trainers.module';
import { NutritionistsModule } from './modules/nutritionists/nutritionists.module';
import { StudentsModule } from './modules/students/students.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { DietsModule } from './modules/diets/diets.module';
import { MealsModule } from './modules/meals/meals.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProgressModule } from './modules/progress/progress.module';
import { GoalsModule } from './modules/goals/goals.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL', 60),
          limit: config.get('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),

    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    TrainersModule,
    NutritionistsModule,
    StudentsModule,
    WorkoutsModule,
    ExercisesModule,
    DietsModule,
    MealsModule,
    ChatModule,
    NotificationsModule,
    PaymentsModule,
    ProgressModule,
    GoalsModule,
    ChallengesModule,
    AiModule,
    AdminModule,
    TenantsModule,
    UploadsModule,
  ],
})
export class AppModule {}
