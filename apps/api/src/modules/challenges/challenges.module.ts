import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { SubscriptionsModule } from '../subscriptions/subscription.module';

@Module({
  imports: [ConfigModule, SubscriptionsModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
