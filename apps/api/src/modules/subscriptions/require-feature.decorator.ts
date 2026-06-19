import { SetMetadata } from '@nestjs/common';
import { PlanFeature } from '../../common/plan-limits';

export const REQUIRE_FEATURE_KEY = 'require_feature';
export const RequireFeature = (...features: PlanFeature[]) =>
  SetMetadata(REQUIRE_FEATURE_KEY, features);
