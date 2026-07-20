import { SetMetadata } from '@nestjs/common';
import { SKIP_SUBSCRIPTION_CHECK_KEY } from './active-subscription.guard';

export const SkipSubscriptionCheck = () => SetMetadata(SKIP_SUBSCRIPTION_CHECK_KEY, true);
