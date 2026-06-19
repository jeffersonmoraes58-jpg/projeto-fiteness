import { Module } from '@nestjs/common';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';
import { SubscriptionsModule } from '../subscriptions/subscription.module';

@Module({
  imports: [SubscriptionsModule],
  controllers: [TrainersController],
  providers: [TrainersService],
  exports: [TrainersService],
})
export class TrainersModule {}

